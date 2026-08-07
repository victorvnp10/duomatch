# ADR-0002: Use pnpm as the package manager

Status: Aceito
Data: 2026-08-07
Decisores: Time de engenharia DuoMatch

## Contexto

A especificação de arquitetura exige que `packages/domain` não tenha nenhuma dependência externa e que nenhum pacote importe algo que não declarou explicitamente em seu próprio `package.json`. Precisamos de um gerenciador de pacotes cujo layout de `node_modules` torne esse tipo de "dependência fantasma" estruturalmente difícil de acontecer por acidente, em vez de depender apenas de revisão manual.

## Decisão

Usar **pnpm** (versão fixada via o campo `packageManager` do `package.json` raiz, ativada via Corepack) como gerenciador de pacotes do monorepo.

## Alternativas consideradas

- **npm**: seu `node_modules` "hoisted" (achatado) permite que um pacote resolva uma dependência que nunca declarou, desde que ela esteja instalada em algum lugar da árvore — exatamente o tipo de bug que queremos impedir estruturalmente em `domain`.
- **Yarn (modo clássico)**: mesmo problema de hoisting do npm. O Yarn PnP (Plug'n'Play) resolveria o problema de dependência fantasma, mas tem uma curva de adoção maior e menos compatibilidade "out of the box" com parte do ecossistema React Native/Capacitor que o app vai usar.

## Consequências

- `node_modules/@duomatch/<pacote>` é criado como link simbólico não achatado; um `import` de algo não declarado no `package.json` daquele pacote falha na resolução, em vez de silenciosamente funcionar.
- Contribuidores precisam habilitar Corepack (`corepack enable`) uma vez por máquina — documentado no README raiz.
- Scripts que dependem de um binário disponível via `node_modules/.bin` (ex. `eslint`, `tsc`) precisam declarar esse binário como dependência do próprio pacote que o invoca, já que o pnpm não expõe bins de dependências transitivas/de pacotes irmãos automaticamente.
