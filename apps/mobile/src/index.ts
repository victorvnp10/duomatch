// Presentation-layer app shell. No screens exist yet - this placeholder only
// proves the app can import from @duomatch/application without violating the
// dependency-direction rule. The actual React Native/Capacitor shell and
// first migrated screen are out of scope for this change (see design.md).
import { assertPositiveIntegerInput } from "@duomatch/application";

export function placeholderEntry(value: number): boolean {
  return assertPositiveIntegerInput(value);
}
