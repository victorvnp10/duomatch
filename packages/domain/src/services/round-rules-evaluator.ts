/**
 * Domain: cyclical round scoring rules
 *
 * Decides who met a round's periodic goal (minimum activities / minimum
 * challenges), who didn't, and the resulting score penalty — as pure
 * functions with no Firestore/Supabase or React dependency. The application
 * layer uses the result to decide what to persist.
 */
import type {
  Activity,
  CyclicalRulesResult,
  EvaluateCyclicalRulesInput,
  Round,
  RoundRule,
} from "../types.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const daysBetween = (laterDateStr: string, earlierDateStr: string): number =>
  Math.floor((new Date(laterDateStr).getTime() - new Date(earlierDateStr).getTime()) / MS_PER_DAY);

/** Returns the round active on the given date, or `null`. */
export const findActiveRound = (rounds: readonly Round[], todayStr: string): Round | null =>
  rounds.find((round) => todayStr >= round.startDate && todayStr <= round.endDate) ?? null;

const activityCreationDate = (activity: Activity, fallback: string): string => {
  const { createdAt } = activity;
  if (createdAt && typeof createdAt !== "string") {
    return createdAt.toDate().toISOString().slice(0, 10);
  }
  return createdAt?.slice(0, 10) ?? fallback;
};

const wasCreatedInCurrentRound = (
  activity: Activity,
  activeRound: Round,
  todayStr: string,
): boolean => {
  const creationDate = activityCreationDate(activity, todayStr);
  return (
    creationDate > activeRound.startDate ||
    (creationDate === activeRound.startDate && creationDate === todayStr)
  );
};

const hasConfirmedSelectionInRound = (
  activity: Activity,
  userId: string,
  activeRound: Round,
): boolean => {
  const selection = activity.selections?.[userId];
  if (selection?.status !== "confirmed") return false;

  return (
    (selection.date ?? "") >= activeRound.startDate && (selection.date ?? "") <= activeRound.endDate
  );
};

/**
 * Counts how many non-challenge activities a user confirmed within the
 * active round, considering only activities created after the round
 * started (avoids counting stale activities from a previous round).
 */
const countConfirmedActivitiesInRound = (
  allActivities: readonly Activity[],
  userId: string,
  activeRound: Round,
  todayStr: string,
): number =>
  allActivities.filter((activity) => {
    if (activity.type?.startsWith("desafio")) return false;
    if (!wasCreatedInCurrentRound(activity, activeRound, todayStr)) return false;
    return hasConfirmedSelectionInRound(activity, userId, activeRound);
  }).length;

/** Counts how many challenges a user created within the active round. */
const countChallengesCreatedInRound = (
  allActivities: readonly Activity[],
  userId: string,
  activeRound: Round,
): number =>
  allActivities.filter((activity) => {
    if (!activity.type?.startsWith("desafio")) return false;
    if (activity.createdBy !== userId) return false;

    const activityDate = activityCreationDate(activity, activeRound.startDate);
    return activityDate >= activeRound.startDate && activityDate <= activeRound.endDate;
  }).length;

interface EvaluateGoalInput {
  rule: RoundRule | undefined;
  lastCheckedDate: string;
  todayStr: string;
  userId: string;
  partnerId: string;
  countFn: (userId: string) => number;
}

interface GoalResult {
  scoreDeltas: Record<string, number> | null;
}

/** Evaluates a single cyclical goal (activities OR challenges), without writing anything. */
const evaluateGoal = ({
  rule,
  lastCheckedDate,
  todayStr,
  userId,
  partnerId,
  countFn,
}: EvaluateGoalInput): GoalResult | null => {
  if (!rule) return null;

  const referenceDate = lastCheckedDate || todayStr;
  if (daysBetween(todayStr, referenceDate) < rule.days) return null;

  const myCount = countFn(userId);
  const partnerCount = countFn(partnerId);
  const iMetGoal = myCount >= rule.quantity;
  const partnerMetGoal = partnerCount >= rule.quantity;

  let scoreDeltas: Record<string, number> | null = null;
  if (iMetGoal && !partnerMetGoal) {
    scoreDeltas = { [userId]: rule.penalty, [partnerId]: -rule.penalty };
  } else if (!iMetGoal && partnerMetGoal) {
    scoreDeltas = { [userId]: -rule.penalty, [partnerId]: rule.penalty };
  }

  return { scoreDeltas };
};

type GoalKey = "activities" | "challenges";

const resolveLastCheckedDate = (activeRound: Round, key: GoalKey): string =>
  activeRound.rulesLastChecked?.[key] ?? activeRound.startDate;

/**
 * Merges a single goal's evaluation result into the running score-deltas and
 * last-checked accumulators. Returns whether the goal was evaluated at all
 * (due), regardless of whether it produced a penalty.
 */
const applyGoalResult = (
  goalResult: GoalResult | null,
  key: GoalKey,
  todayStr: string,
  scoreDeltas: Record<string, number>,
  lastCheckedUpdates: CyclicalRulesResult["lastCheckedUpdates"],
): boolean => {
  if (!goalResult) return false;

  if (goalResult.scoreDeltas) {
    for (const [uid, delta] of Object.entries(goalResult.scoreDeltas)) {
      scoreDeltas[uid] = (scoreDeltas[uid] ?? 0) + delta;
    }
  }
  lastCheckedUpdates[key] = todayStr;
  return true;
};

/**
 * Evaluates the active round's two cyclical goals (minimum activities,
 * minimum challenges) and returns a plan of score changes and which
 * `rulesLastChecked` markers to update. Returns `null` when there is
 * nothing to do (no rules configured, or none due yet).
 */
export const evaluateCyclicalRules = ({
  activeRound,
  allActivities,
  userId,
  partnerId,
  todayStr,
}: EvaluateCyclicalRulesInput): CyclicalRulesResult | null => {
  if (!activeRound) return null;

  const activitiesRule = activeRound.rules?.minActivities;
  const challengesRule = activeRound.rules?.minChallenges;
  if (!activitiesRule && !challengesRule) return null;

  const scoreDeltas: Record<string, number> = {};
  const lastCheckedUpdates: CyclicalRulesResult["lastCheckedUpdates"] = {};

  const activitiesResult = evaluateGoal({
    rule: activitiesRule,
    lastCheckedDate: resolveLastCheckedDate(activeRound, "activities"),
    todayStr,
    userId,
    partnerId,
    countFn: (uid) => countConfirmedActivitiesInRound(allActivities, uid, activeRound, todayStr),
  });
  const challengesResult = evaluateGoal({
    rule: challengesRule,
    lastCheckedDate: resolveLastCheckedDate(activeRound, "challenges"),
    todayStr,
    userId,
    partnerId,
    countFn: (uid) => countChallengesCreatedInRound(allActivities, uid, activeRound),
  });

  const activitiesDue = applyGoalResult(
    activitiesResult,
    "activities",
    todayStr,
    scoreDeltas,
    lastCheckedUpdates,
  );
  const challengesDue = applyGoalResult(
    challengesResult,
    "challenges",
    todayStr,
    scoreDeltas,
    lastCheckedUpdates,
  );

  if (!activitiesDue && !challengesDue) return null;
  return { scoreDeltas, lastCheckedUpdates };
};
