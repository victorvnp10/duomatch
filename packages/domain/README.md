# @duomatch/domain

Pure business rules: entities, value objects, and domain services. No I/O, no framework, no database client, no `Date.now()` unless injected — everything here must be trivially unit-testable in milliseconds.

**Zero external dependencies.** If a change to this package requires adding a runtime dependency, that's a signal the logic doesn't belong here.

## Run

```bash
pnpm --filter @duomatch/domain build
pnpm --filter @duomatch/domain lint
pnpm --filter @duomatch/domain typecheck
```

## Test

```bash
pnpm --filter @duomatch/domain test
```

Target: ≥90% coverage once real domain modules (achievements, round-rules, points, cycle) land here.

## Key decisions

- Organized as one exported surface per concept (e.g. `achievements/`, `round-rules/`), re-exported from `src/index.ts` — see `openspec/changes/setup-architecture-foundation/design.md` for why this package exists before any business logic is migrated into it.
