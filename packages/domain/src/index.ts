// Placeholder pure-function export. Domain modules migrated from the existing
// app (achievements, round-rules, points, cycle) will be added as sibling
// files here, re-exported from this index — never imported from outside
// packages/domain.
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

import { noop } from "@duomatch/application";
