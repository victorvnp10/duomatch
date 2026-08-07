# @duomatch/infrastructure-supabase

Concrete adapters for the port interfaces defined in `@duomatch/application`: Supabase queries, RPC calls, realtime subscriptions. Depends only on `@duomatch/domain` for types — this package implements application's ports but does not import `@duomatch/application` itself.

## Run

```bash
pnpm --filter @duomatch/infrastructure-supabase build
pnpm --filter @duomatch/infrastructure-supabase lint
pnpm --filter @duomatch/infrastructure-supabase typecheck
```

## Key decisions

Any write that involves sensitive business rules (points, approvals, achievement unlocks) must go through a `security definer` RPC, never a direct `insert`/`update` from this package — see `openspec/changes/setup-architecture-foundation/proposal.md`. Supabase schema, RPCs, and Edge Functions are out of scope for this change; this package is currently an empty shell proving the dependency direction.
