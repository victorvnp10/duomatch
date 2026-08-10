import type { Round, RoundRule, RulesLastChecked } from "@duomatch/domain";

// Shape of a row returned by `.from("rounds").select("*")`. min_activities_*
// / min_challenges_* are individual columns (see
// supabase/migrations/0002_rounds_table.sql) rather than nested objects, so
// a rule only maps to a domain RoundRule when all three of its columns are
// set.
export interface RoundRow {
  id: string;
  start_date: string;
  end_date: string;
  min_activities_days: number | null;
  min_activities_quantity: number | null;
  min_activities_penalty: number | null;
  min_challenges_days: number | null;
  min_challenges_quantity: number | null;
  min_challenges_penalty: number | null;
  activities_last_checked: string | null;
  challenges_last_checked: string | null;
}

const mapMinActivitiesRule = (row: RoundRow): RoundRule | undefined =>
  row.min_activities_days != null &&
  row.min_activities_quantity != null &&
  row.min_activities_penalty != null
    ? {
        days: row.min_activities_days,
        quantity: row.min_activities_quantity,
        penalty: row.min_activities_penalty,
      }
    : undefined;

const mapMinChallengesRule = (row: RoundRow): RoundRule | undefined =>
  row.min_challenges_days != null &&
  row.min_challenges_quantity != null &&
  row.min_challenges_penalty != null
    ? {
        days: row.min_challenges_days,
        quantity: row.min_challenges_quantity,
        penalty: row.min_challenges_penalty,
      }
    : undefined;

export const mapRoundRow = (row: RoundRow): Round => {
  const minActivities = mapMinActivitiesRule(row);
  const minChallenges = mapMinChallengesRule(row);

  // exactOptionalPropertyTypes forbids assigning `undefined` to an optional
  // property directly — the key must be omitted instead.
  const rules: Round["rules"] = {
    ...(minActivities ? { minActivities } : {}),
    ...(minChallenges ? { minChallenges } : {}),
  };
  const rulesLastChecked: RulesLastChecked = {
    ...(row.activities_last_checked ? { activities: row.activities_last_checked } : {}),
    ...(row.challenges_last_checked ? { challenges: row.challenges_last_checked } : {}),
  };

  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    rules,
    rulesLastChecked,
  };
};
