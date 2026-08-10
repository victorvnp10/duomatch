# ADR-0005: Esquema Postgres e convenções de adapter para achievements/round-rules

Status: Aceito
Data: 2026-08-09
Decisores: Time de engenharia DuoMatch

## Contexto

O change `migrate-persistence-achievements-round-rules` precisa persistir, no Supabase/Postgres, os dados que alimentam as regras de domínio já portadas em `packages/domain` (`buildAchievementStats`, `evaluateNewAchievements`, `findActiveRound`, `evaluateCyclicalRules`). Duas garantias de comportamento exigidas pela spec desse change — achievement é persistido no máximo uma vez, e o ajuste de score de uma round-rule é aplicado de forma tudo-ou-nada — precisam sobreviver a chamadas repetidas e a falhas parciais, o que é uma escolha de armazenamento, não só de lógica de aplicação.

## Decisão

1. **Tabelas normalizadas, não um blob JSONB por casal.** `couples`, `activities`, `activity_selections`, `rewards`, `wishlist_items`, `rounds` e `couple_achievements` são tabelas relacionais com chaves estrangeiras para `couples.id`, em vez de espelhar o documento Firestore como uma única coluna JSONB.
2. **`couple_achievements` é append-only com constraint de unicidade** em `(couple_id, achievement_id)`. A persistência de um achievement novo usa `upsert(..., { onConflict: "couple_id,achievement_id", ignoreDuplicates: true })`, delegando ao banco — não ao código do adapter — a garantia de "no máximo uma vez".
3. **Ajuste de score de round-rule via função `SECURITY DEFINER` transacional** (`apply_round_rule_adjustment`), chamada por `supabase.rpc(...)`. A função aplica os deltas de score de ambos os parceiros e atualiza `rules_last_checked` no mesmo corpo de função — portanto na mesma transação implícita — e revalida que quem chama é de fato um dos dois membros do casal antes de escrever, mesmo sendo `SECURITY DEFINER`.
4. **Políticas de RLS usam `(select auth.uid())`, não `auth.uid()` direto**, em toda tabela nova, seguindo a otimização documentada pelo Supabase para evitar reavaliação por linha.

## Alternativas consideradas

- **Uma coluna JSONB por casal**, mais próxima do formato Firestore legado e com menor esforço de migração futura. Descartada: exigiria leitura-modificação-escrita do documento inteiro e controle de concorrência na camada de aplicação para as mesmas garantias de "exatamente uma vez" — reintroduzindo, em código, a classe de bug que a portagem da camada de domínio já eliminou.
- **Duas escritas sequenciais do cliente** (uma para score, outra para `rules_last_checked`) em vez de uma RPC única. Descartada: `supabase-js` não expõe transação multi-statement do lado do cliente via PostgREST; sem ela, uma falha entre as duas escritas deixaria um ajuste parcial — violando diretamente o requirement "Partial failure does not apply a partial adjustment".
- **`GRANT EXECUTE` apenas via `REVOKE ... FROM PUBLIC`** na função RPC. Insuficiente na prática: o Supabase concede `EXECUTE` a `anon`/`authenticated` por padrão na criação da função, independente do revoke de `PUBLIC` — confirmado por `get_advisors` apontando `anon` como executor após o revoke de `PUBLIC` sozinho. Foi necessário um `REVOKE EXECUTE ... FROM anon` explícito.

## Consequências

- As garantias de "exatamente uma vez" e "tudo ou nada" vivem em constraints e em uma função de banco, não em lógica de aplicação — mais fácil de auditar, mas qualquer evolução dessas regras (ex. permitir desfazer um ajuste) precisa mexer em SQL, não só em TypeScript.
- Adicionar `@supabase/supabase-js` como dependência de `packages/infrastructure-supabase` exigiu uma nova regra em `dependency-cruiser.config.mjs` (`packages/infrastructure-supabase → node_modules/@supabase/supabase-js`) — fricção já prevista pelo ADR-0003 para novas dependências de terceiros nessa camada.
- `packages/application` define os ports (`AchievementsRepository`, `RoundRulesRepository`) e `packages/infrastructure-supabase` os satisfaz estruturalmente, sem importar `packages/application` — quem efetivamente conecta os dois (a "composition root") fica para o change que também escolher o framework de UI de `apps/mobile`, já que a regra atual de dependency-cruiser não permite `apps/*` importar `infrastructure-supabase` diretamente.
