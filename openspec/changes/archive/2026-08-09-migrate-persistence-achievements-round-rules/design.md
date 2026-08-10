## Context

See proposal.md - Why. Relevant current state:

- `packages/domain` exposes pure functions (`buildAchievementStats`, `evaluateNewAchievements`, `findActiveRound`, `evaluateCyclicalRules`) operating on the types in `packages/domain/src/types.ts` (`CoupleData`, `Activity`, `Reward`, `WishlistItem`, `Round`, `RoundRule`). Those types still carry Firestore-shaped idioms (e.g. `Activity.selections: Record<string, ActivitySelection>` keyed by date, `Activity.createdAt: string | { toDate: () => Date }`) which this change must map into relational storage without altering the domain module itself.
- `packages/application/src/index.ts` and `packages/infrastructure-supabase/src/index.ts` are placeholder stubs with no real exports.
- `apps/mobile` has no UI framework dependency yet (no React/React Native in `package.json`), so there is no presentation-layer consumer to design hooks against yet.
- A Supabase project (`pwoivqbcxhdpfmeqcdfg`) is already provisioned and reachable via the `supabase` MCP server configured in `.mcp.json`.
- `architecture-governance` requires: `domain` has zero external deps; `application` may only import `domain`; `infrastructure-supabase` may only import `domain` directly (not `application`) and application wires the concrete adapter in; any new cross-cutting tooling choice needs an ADR.

## Goals / Non-Goals

**Goals:**

- Define a normalized Postgres schema that losslessly represents the couple/activity/reward/wishlist/round data the domain functions consume and produce.
- Define `packages/application` ports (repository interfaces) that the domain's input/output shapes map onto, independent of Supabase.
- Implement `packages/infrastructure-supabase` adapters satisfying those ports.
- Provide framework-agnostic use-case functions in `packages/application` (`runAchievementEvaluation(coupleId)`, `runRoundRuleEvaluation(coupleId)` or similar) that a future presentation layer can call directly, or wrap in whatever query/state library it ends up using.
- Enforce couple-level data isolation via Postgres Row Level Security.

**Non-Goals:**

- Choosing or installing a UI framework or query library (TanStack Query, SWR, etc.) for `apps/mobile` — no presentation-layer consumer exists yet to design against.
- Migrating existing legacy Firestore data into the new schema (a one-time data-migration script is a separate follow-on change once cutover is scheduled).
- Changing any behavior in `packages/domain` — its functions and types are treated as a fixed contract.

## Decisions

### Schema shape: normalized tables, not a single JSONB blob per couple

Mirror the legacy Firestore document's nested shape (`activities[]`, `rewards[]`, `wishlistItems[]`, `rounds[]` all under one couple doc) as separate Postgres tables (`couples`, `activities`, `activity_selections`, `rewards`, `wishlist_items`, `rounds`) with foreign keys to `couples.id`, rather than a single JSONB column per couple.

- **Why**: RLS policies, indexing (e.g. `WHERE couple_id = ... AND status = 'completed'` for stats building), and the "persist exactly once" / "apply exactly once per period" requirements in the spec are all natural with relational rows and unique constraints; a JSONB blob would require read-modify-write of the whole document and application-level concurrency control, reintroducing the class of race condition the domain layer was ported specifically to eliminate.
- **Alternative considered**: one JSONB `couple_state` column, closest to the Firestore shape and least migration work later. Rejected because it pushes the "exactly once" guarantees (Requirement: _Newly unlocked achievements are persisted exactly once_, _Round-rule score adjustments are applied exactly once per period_) into application code instead of database constraints.

### Achievement unlocks: append-only table with a uniqueness constraint

Store unlocked achievements as rows in `couple_achievements (couple_id, achievement_id, unlocked_at)` with a unique constraint on `(couple_id, achievement_id)`, rather than an array column on `couples`.

- **Why**: the unique constraint makes "not already recorded as unlocked" (spec requirement) enforceable by the database via `ON CONFLICT DO NOTHING`, not just by the calling code re-checking first — closing the same race-condition class as the JSONB decision above.

### Round-rule score application: single RPC transaction

Implement round-rule score adjustment + `rules_last_checked` update as one Postgres function (`SECURITY DEFINER` RPC) called through `supabase-js .rpc(...)`, rather than two separate client-side writes.

- **Why**: the spec requires "Partial failure does not apply a partial adjustment." A single transactional RPC guarantees atomicity; two sequential client writes cannot, since the client could crash or lose connectivity between them.
- **Alternative considered**: client-side Postgres transaction via multiple statements. Rejected because `supabase-js` does not expose multi-statement client transactions over PostgREST; an RPC is the standard Supabase pattern for this.

### Application layer: plain async functions, no query library yet

`packages/application` exposes plain `async function` use cases (e.g. `evaluateAndPersistAchievements(deps, coupleId): Promise<string[]>`) taking its repository ports as explicit parameters (or a small factory), not React hooks.

- **Why**: `apps/mobile` has no UI framework installed, so there is nothing to bind hooks to yet; framework-agnostic functions are directly unit-testable with fake ports and keep `packages/application` free of a premature dependency on any particular UI/query library, consistent with the "no half-finished implementations" guidance — wrapping them in hooks nothing consumes would be exactly that.
- **Alternative considered**: build the TanStack Query hooks now per the prior change's stated follow-on plan. Rejected for this change because it would add a React dependency to a package with no React consumer, and the specific query-library choice belongs to whichever change picks `apps/mobile`'s UI framework.

### Ports live in `packages/application`, adapters in `packages/infrastructure-supabase`

Repository interfaces (e.g. `AchievementsRepository`, `RoundRulesRepository`) are defined as TypeScript interfaces in `packages/application`; `packages/infrastructure-supabase` implements them and depends only on the domain types it needs to satisfy those interfaces, never importing from `packages/application`.

- **Why**: required by the existing `architecture-governance` spec ("Application imports infrastructure directly" / dependency-inversion scenario) — this is not a new decision so much as applying the already-recorded rule.

## Risks / Trade-offs

- [Normalized schema is more migration work than a JSONB mirror of Firestore] → Accepted: the exactly-once guarantees this unlocks are required by the spec regardless of storage shape, so the relational approach avoids re-solving the same problem in application code later.
- [`SECURITY DEFINER` RPC for score adjustment centralizes trust in one function] → Mitigate by scoping the RPC narrowly (only couple-scoped round-rule writes, no arbitrary SQL) and covering it with the couple-isolation scenario in the spec; document the function's exact permissions in the migration file.
- [Building ports/use-cases with no real caller yet risks designing an interface that doesn't fit the eventual UI framework] → Mitigate by keeping the use-case functions plain async functions with explicit dependencies (easy to wrap in any hook library later) rather than guessing a framework's idioms now.

## Migration Plan

1. Add Supabase SQL migration(s) creating `couples`, `activities`, `activity_selections`, `rewards`, `wishlist_items`, `rounds`, `couple_achievements`, and the score-adjustment RPC, each with RLS policies scoped to the couple's two member user ids.
2. Add `packages/application` port interfaces and the two use-case functions, with unit tests using in-memory fake adapters.
3. Add `packages/infrastructure-supabase` adapters implementing the ports against the new tables, with tests against a local/ephemeral Supabase instance or mocked PostgREST responses.
4. No production cutover in this change — the legacy Firestore app keeps running unmodified; a later change wires `apps/mobile` to these use cases and, separately, migrates existing production data.
5. Rollback: since nothing yet reads from the new schema in production, rollback is dropping the new migration(s) and deleting the new package code — no data-loss risk.

## Open Questions

- Exact production data-migration strategy (backfill script, dual-write window, or hard cutover) from Firestore to the new schema — deferred to the change that schedules the actual cutover, since it doesn't change this change's schema, ports, or tasks.
