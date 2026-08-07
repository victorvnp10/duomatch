# ADR-0001: Use Turborepo as the monorepo orchestrator

Status: Aceito
Data: 2026-08-07
Decisores: Time de engenharia DuoMatch

## Contexto

O DuoMatch está sendo reescrito do zero como um monorepo organizado por camada arquitetural (`domain`, `application`, `infrastructure-supabase`, `apps/*`). Precisamos de uma ferramenta que orquestre build/lint/typecheck/test entre pacotes, com cache e execução incremental, sem impor um modelo de configuração pesado para um projeto que hoje tem apenas quatro pacotes de camada e um pipeline de CI.

## Decisão

Usar **Turborepo** (`turbo.json`) como orquestrador de tarefas do monorepo.

## Alternativas consideradas

- **Nx**: oferece geradores, grafo de dependências visual e regras de fronteira de módulo nativas. Descartado por agora porque sua superfície de configuração e convenções são maiores do que o projeto precisa nesta escala; a capacidade de enforcement de camadas já é coberta separadamente por `dependency-cruiser` (ADR-0003).
- **Scripts npm/pnpm manuais sem orquestrador**: descartado por não oferecer cache incremental nem paralelização automática entre pacotes, o que se tornaria doloroso assim que mais pacotes (e o app real) forem adicionados.

## Consequências

- Cache local (`.turbo/`) acelera reexecuções de lint/typecheck/test/build à medida que o monorepo cresce.
- A estrutura de pacotes por camada continua sendo o ativo principal — trocar de orquestrador no futuro (ex. para Nx) seria uma mudança de configuração, não uma re-arquitetura, caso o time precise de geradores ou de um grafo de dependências visual mais adiante.
- Precisamos manter `turbo.json` sincronizado à medida que novos scripts (`build`, `lint`, `typecheck`, `test`, `dead-code`) forem adicionados a cada pacote.
