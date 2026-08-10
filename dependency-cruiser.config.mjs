// Whole-repo module graph check (see openspec/changes/setup-architecture-foundation/design.md
// - "Dependency-direction enforcement" decision). This is a whitelist: `allowed` means any edge
// NOT matching one of the rules below is reported at `allowedSeverity` - fail-closed by default,
// so a new package or a new cross-layer import is blocked until this file is deliberately edited.
// Cross-package imports resolve through each package's built `dist/`, not its `src/`, so `to`
// patterns match on the `packages/<name>` or `apps/<name>` prefix, not on `/src/`.
// `allowed` entries only support `from`/`to` (no `name`/`comment` - see dependency-cruiser's rule
// schema), so the intent of each rule is documented here instead:
//   1. domain must not import anything outside itself - no other layer, no third-party SDK
//   2. application orchestrates domain; must not import infrastructure or presentation directly
//   3. infrastructure implements application's ports but must not import application itself
//   4. apps may only reach domain/infrastructure through application
export default {
  allowed: [
    {
      from: { path: "^packages/domain" },
      to: { path: "^packages/domain" },
    },
    {
      from: { path: "^packages/application" },
      to: { path: "^(packages/application|packages/domain)" },
    },
    {
      from: { path: "^packages/infrastructure-supabase" },
      to: { path: "^(packages/infrastructure-supabase|packages/domain)" },
    },
    // migrate-persistence-achievements-round-rules: infrastructure-supabase's
    // Supabase adapters need the actual client SDK. Workspace deps resolve
    // through pnpm's node_modules/.pnpm/<pkg>@<version>/... symlink target,
    // so this matches on the unpacked package path rather than being
    // anchored to the start of the resolved path.
    {
      from: { path: "^packages/infrastructure-supabase" },
      to: { path: "node_modules/@supabase/supabase-js" },
    },
    {
      from: { path: "^apps/[^/]+" },
      to: { path: "^(apps/[^/]+|packages/application)" },
    },
  ],
  allowedSeverity: "error",
  options: {
    // Entry points passed on the CLI are each package's `src/` only (see the `dep-check` script
    // in the root package.json) - packages/config and dist/coverage output are never scan roots,
    // so they don't need to be excluded here. Test files ARE excluded: they legitimately import
    // the test framework (e.g. domain's *.test.ts importing vitest), which is not a production
    // runtime dependency the layer rules above are meant to police. node_modules itself is
    // intentionally NOT excluded (only doNotFollow'd below): an edge from a non-test file in
    // domain/application/infrastructure/apps into a third-party package must still be created and
    // validated against the `allowed` rules above, so e.g. domain importing a database SDK is
    // caught, not silently dropped from the graph.
    exclude: { path: "\\.(test|spec)\\.tsx?$" },
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
