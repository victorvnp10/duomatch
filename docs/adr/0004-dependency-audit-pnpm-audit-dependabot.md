# ADR-0004: Dependency vulnerability audit via pnpm audit + Dependabot, not Snyk

Status: Aceito
Data: 2026-08-07
Decisores: Time de engenharia DuoMatch

## Contexto

A especificação exige que dependências com vulnerabilidade conhecida de severidade alta/crítica bloqueiem o merge. Precisamos de uma forma de checar isso em todo PR sem adicionar uma conta paga ou uma nova integração externa logo no primeiro commit do projeto.

## Decisão

Usar **`pnpm audit --audit-level=high`** como step obrigatório de CI (falha o build em vulnerabilidade alta/crítica), complementado pelos **alertas nativos do GitHub Dependabot** habilitados no repositório para monitoramento contínuo fora do ciclo de PR.

## Alternativas consideradas

- **Snyk**: base de dados de vulnerabilidades mais profunda e PRs de auto-fix, mas exige conta paga e uma nova integração externa — custo não justificado no estágio atual do projeto. Revisitar via um novo ADR se o sinal do `pnpm audit` se mostrar raso ou ruidoso demais.

## Consequências

- Custo marginal zero: nenhuma conta nova, nenhum segredo adicional de CI além do `GITHUB_TOKEN` padrão.
- Habilitar os alertas do Dependabot é uma configuração do repositório no GitHub (Settings → Code security), não um arquivo versionado — precisa ser feito manualmente por quem tem acesso admin ao repositório (fora do escopo do que este scaffold consegue automatizar sem credenciais).
- Se `pnpm audit` se mostrar insuficiente (falsos negativos, base de dados desatualizada) para o volume de dependências do projeto, a migração para Snyk fica documentada aqui como alternativa já avaliada, não como decisão a ser redescoberta do zero.
