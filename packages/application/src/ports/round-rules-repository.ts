/**
 * Port for loading a couple's round-rule-evaluation inputs and persisting a
 * computed score adjustment. `packages/infrastructure-supabase` implements
 * this against Postgres; this package only depends on the shape.
 */
import type { Activity, CyclicalRulesResult, Round } from "@duomatch/domain";

export interface RoundRuleInputs {
  userId: string;
  partnerId: string;
  rounds: readonly Round[];
  // Not readonly: matches domain's EvaluateCyclicalRulesInput.allActivities.
  allActivities: Activity[];
}

export interface RoundRulesRepository {
  loadRoundRuleInputs(coupleId: string): Promise<RoundRuleInputs>;
  /** Applies the adjustment atomically (score deltas + rulesLastChecked) for the given round. */
  persistRoundRuleAdjustment(roundId: string, result: CyclicalRulesResult): Promise<void>;
}
