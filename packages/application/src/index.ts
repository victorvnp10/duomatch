// Use-case orchestration lives here: hooks and functions that decide *when*
// to call domain rules and *what* to persist through infrastructure ports,
// without containing the rules themselves. Empty until the first capability
// (e.g. achievements) is migrated per the Strangler Fig plan.
import { isPositiveInteger } from "@duomatch/domain";

export function assertPositiveIntegerInput(value: number): boolean {
  return isPositiveInteger(value);
}
