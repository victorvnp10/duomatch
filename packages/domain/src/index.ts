// Barrel export for packages/domain. Every domain module is added as a
// sibling file/folder and re-exported here — never imported from outside
// packages/domain via a deep path.
export * from "./entities/achievement.js";
export * from "./services/achievement-stats-builder.js";
export * from "./services/round-rules-evaluator.js";
export type * from "./types.js";

// Placeholder pure-function export, kept because packages/application's own
// placeholder demonstrates the application -> domain dependency by calling
// it. Safe to remove once application has a real consumer of the modules
// above instead.
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
