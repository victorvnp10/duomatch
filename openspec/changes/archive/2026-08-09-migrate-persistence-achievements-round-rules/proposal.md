## Why

`migrate-domain-achievements-round-rules` ported the achievement-unlock and cyclical round-rule logic into `packages/domain` as pure, tested functions, but explicitly deferred "the application-layer change (TanStack Query hooks over Supabase) that orchestrates calls to `evaluateNewAchievements`, `buildAchievementStats`, and `evaluateCyclicalRules` against real data." `packages/application` and `packages/infrastructure-supabase` are still empty stubs, and the legacy DuoMatch app still reads/writes this data from Firestore. A field-by-field survey of the legacy Firestore `duomatch_new` collection has already been completed, and a Supabase project is already provisioned and connected — the schema and orchestration layer can be built directly on that groundwork without re-investigating the legacy data shape.

## What Changes

- Design a normalized Postgres schema (couples, activities, activity selections, rewards, wishlist items, rounds, round rules, unlocked achievements) that captures the data currently read/written by the legacy Firestore `duomatch_new` document shape reflected in `packages/domain/src/types.ts` (`CoupleData`, `Activity`, `Reward`, `WishlistItem`, `Round`, `RoundRule`).
- Add Supabase SQL migrations creating these tables with Row Level Security scoped to the two members of a couple.
- Define application-layer ports in `packages/application` (repository interfaces for loading the inputs `buildAchievementStats`, `evaluateNewAchievements`, and `evaluateCyclicalRules` need, and for persisting their outputs).
- Implement `packages/infrastructure-supabase` adapters for those ports using the Supabase JS client against the new schema.
- Add framework-agnostic use-case functions in `packages/application` that use the ports to fetch a couple's current data, run the domain evaluators, and persist newly unlocked achievements and round-rule score deltas. `apps/mobile` has no UI framework installed yet, so this change does not add TanStack Query (or any other) hooks — that wiring is a follow-on once presentation picks a UI framework.
- **BREAKING**: none — `packages/application` and `packages/infrastructure-supabase` have no consumers yet; the legacy Firestore app is untouched by this change.

## Capabilities

### New Capabilities

- `persistence-achievements-round-rules`: end-to-end behavior for loading a couple's achievement/round-rule inputs from Postgres, evaluating them via the existing domain rules, and persisting the resulting newly-unlocked achievements and score adjustments back to Postgres through Supabase.

### Modified Capabilities

(none — `domain-achievements-round-rules` and `architecture-governance` requirements are unchanged; this change only adds a new layer on top of them)

## Impact

- **Affected code**: new SQL migrations for the Supabase project (`pwoivqbcxhdpfmeqcdfg`); `packages/application/src/**` (ports + TanStack Query hooks); `packages/infrastructure-supabase/src/**` (Supabase adapters). No changes to `packages/domain` or `apps/mobile`.
- **Dependencies added**: `@supabase/supabase-js` in `packages/infrastructure-supabase`. No query-library dependency is added in this change.
- **ADR**: likely needed for the Supabase client/schema conventions adopted in `packages/infrastructure-supabase`, per the architecture-governance requirement that cross-cutting tooling choices be recorded — to be confirmed in design.md.
- **Follow-on changes unblocked**: choosing a UI framework and query library for `apps/mobile` and wiring its screens to the new application-layer use cases; eventually retiring the legacy Firestore reads/writes.
