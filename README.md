# DuoMatch

Monorepo for the DuoMatch rewrite. See `openspec/changes/setup-architecture-foundation/` for the proposal, spec, design, and task breakdown that produced this scaffold.

## Setup

This repo uses [pnpm](https://pnpm.io) via [Corepack](https://nodejs.org/api/corepack.html), which ships with Node.js 16.9+.

```bash
corepack enable
pnpm install
```

## Layout

Packages are organized by **architectural layer**, not by technology or feature:

```
apps/
  mobile/                    # presentation layer (app shell)
packages/
  domain/                    # pure business rules, zero external dependencies
  application/                # use-case orchestration; depends on domain only
  infrastructure-supabase/    # concrete adapters for domain/application ports
  config/                      # shared tsconfig, ESLint preset
```

The dependency direction is enforced automatically (see `dependency-cruiser.config.mjs` and `packages/*/dep-check` scripts): `domain` never imports from any other layer; `application` and `infrastructure-supabase` may only import from `domain`; `apps/*` may import from `application`.

## Common commands

Run from the repo root (Turborepo fans these out to every affected package):

```bash
pnpm lint        # ESLint across all packages
pnpm typecheck    # tsc --noEmit across all packages
pnpm test         # Vitest across all packages
pnpm dep-check    # dependency-cruiser layer check across all packages
pnpm dead-code    # ts-prune unused-export scan across all packages
```

## Architecture decisions

See `docs/adr/` for the recorded rationale behind the tool choices in this scaffold (monorepo orchestrator, package manager, dependency-direction tool, dependency-audit approach).
