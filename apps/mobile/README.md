# @duomatch/mobile

Presentation layer app shell. Depends only on `@duomatch/application` — never imports `@duomatch/domain` or `@duomatch/infrastructure-supabase` directly, so every screen goes through the same orchestration layer.

## Run

```bash
pnpm --filter @duomatch/mobile build
pnpm --filter @duomatch/mobile lint
pnpm --filter @duomatch/mobile typecheck
```

## Key decisions

This is currently a placeholder proving the dependency direction compiles; no UI framework (React Native/Capacitor), screens, or navigation are wired up yet — that migration happens screen-by-screen once `application/` has real use cases to render (see `openspec/changes/setup-architecture-foundation/design.md` Non-Goals).
