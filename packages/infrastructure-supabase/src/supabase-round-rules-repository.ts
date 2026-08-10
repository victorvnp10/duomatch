import type { Activity, CyclicalRulesResult, Round } from "@duomatch/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mapActivityRow, type ActivityRow } from "./mappers/activity-row.js";
import { mapRoundRow, type RoundRow } from "./mappers/round-row.js";
import { resolveCoupleMembers } from "./resolve-couple-members.js";

// Structurally matches @duomatch/application's RoundRuleInputs without
// importing it (infrastructure-supabase must not depend on
// packages/application — see architecture-governance).
export interface SupabaseRoundRuleInputs {
  userId: string;
  partnerId: string;
  rounds: Round[];
  allActivities: Activity[];
}

const ACTIVITY_SELECT =
  "type, category, created_by, created_at, activity_selections(user_id, status, selection_date)";

/**
 * Structurally satisfies @duomatch/application's RoundRulesRepository port.
 * The application layer wires this in; this class itself never imports
 * from packages/application.
 */
export class SupabaseRoundRulesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async loadRoundRuleInputs(coupleId: string): Promise<SupabaseRoundRuleInputs> {
    const { userId, partnerId } = await resolveCoupleMembers(this.client, coupleId);

    const [roundsResult, activitiesResult] = await Promise.all([
      this.client.from("rounds").select("*").eq("couple_id", coupleId),
      this.client.from("activities").select(ACTIVITY_SELECT).eq("couple_id", coupleId),
    ]);

    if (roundsResult.error) throw roundsResult.error;
    if (activitiesResult.error) throw activitiesResult.error;

    const rounds: Round[] = ((roundsResult.data ?? []) as RoundRow[]).map(mapRoundRow);
    const allActivities: Activity[] = ((activitiesResult.data ?? []) as ActivityRow[]).map(
      mapActivityRow,
    );

    return { userId, partnerId, rounds, allActivities };
  }

  /** Delegates to the apply_round_rule_adjustment RPC (supabase/migrations/0005) for atomicity. */
  async persistRoundRuleAdjustment(roundId: string, result: CyclicalRulesResult): Promise<void> {
    const { error } = await this.client.rpc("apply_round_rule_adjustment", {
      p_round_id: roundId,
      p_score_deltas: result.scoreDeltas,
      p_activities_checked_date: result.lastCheckedUpdates.activities ?? null,
      p_challenges_checked_date: result.lastCheckedUpdates.challenges ?? null,
    });
    if (error) throw error;
  }
}
