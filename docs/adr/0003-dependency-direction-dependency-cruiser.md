# ADR-0003: Enforce layer dependency direction with dependency-cruiser

Status: Aceito
Data: 2026-08-07
Decisores: Time de engenharia DuoMatch

## Contexto

A regra mais importante desta reescrita é a direção de dependência entre camadas: `presentation → application → domain`, `infrastructure-supabase → domain`, e `domain` não pode importar nada fora de si mesmo — nem outra camada, nem um SDK de terceiros. Essa regra precisa ser verificada automaticamente em todo PR, falhando o build em caso de violação, sem depender de um revisor humano lembrar de checar.

## Decisão

Usar **dependency-cruiser**, configurado como uma lista de permissões (`allowed`) com `allowedSeverity: "error"`: qualquer aresta do grafo de módulos que não bater com uma das regras listadas é reportada como erro. Isso torna o comportamento **fail-closed** — um pacote novo, ou uma nova dependência de terceiros em `domain`, é bloqueado até que o arquivo de configuração seja deliberadamente editado.

O comando (`pnpm dep-check`) roda uma vez na raiz do repositório, analisando o grafo inteiro (`packages/*/src` e `apps/*/src` como pontos de entrada), em vez de rodar isoladamente dentro de cada pacote — isso é necessário para que os caminhos relatados (`packages/domain/...`) batam com os padrões `from`/`to` da regra.

## Alternativas consideradas

- **`eslint-plugin-boundaries`**: manteria tudo dentro de uma única invocação do ESLint, mas seu modelo de fronteiras é baseado em casamento de padrão por nome de camada, mais fraco para detectar cadeias de import indiretas do que a travessia de grafo completa do dependency-cruiser.
- **Revisão manual apenas**: descartada — é exatamente o padrão que já falhou na base atual (lógica de negócio vazando para componentes de UI sem ninguém notar a tempo).

## Consequências

- Arquivos de teste (`*.test.ts`) são excluídos da checagem, já que legitimamente importam o framework de teste (ex. `domain/*.test.ts` importando `vitest`), o que não é uma dependência de runtime de produção.
- Como pacotes de workspace resolvem via `dist/` (não `src/`) quando importados entre si, os padrões `to` das regras casam com o prefixo `packages/<nome>` de forma ampla — não restrito a `/src/` — para cobrir tanto a fonte quanto o alvo resolvido.
- Adicionar uma nova dependência de terceiros legítima em `application` ou `infrastructure-supabase` (ex. `@supabase/supabase-js`) exigirá editar `dependency-cruiser.config.mjs` para declarar a aresta como permitida — fricção deliberada, não um bug.
