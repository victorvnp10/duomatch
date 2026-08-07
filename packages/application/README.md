# @duomatch/application

Use-case orchestration: hooks and functions that decide _when_ to call domain rules and _what_ to persist, without containing the rules themselves. Depends only on `@duomatch/domain`; defines the port interfaces that `@duomatch/infrastructure-supabase` implements (Dependency Inversion — this package never imports the infrastructure package).

## Run

```bash
pnpm --filter @duomatch/application build
pnpm --filter @duomatch/application lint
pnpm --filter @duomatch/application typecheck
```

## Test

```bash
pnpm --filter @duomatch/application test
```

Target: ≥70% coverage once real use cases land, with infrastructure mocked via the port interfaces defined here.

## Key decisions

Real-time subscriptions (Supabase Realtime) are encapsulated in hooks here, never called directly from `apps/*` — see `openspec/changes/setup-architecture-foundation/design.md`.
