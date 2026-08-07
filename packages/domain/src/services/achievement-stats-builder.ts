/**
 * Domain service: computes the statistics snapshot used to evaluate
 * achievements (see `../entities/achievement.ts`). Pure: receives data
 * already loaded by the application layer and returns a stats object, with
 * no knowledge of Firestore/Supabase, React, or any other infrastructure
 * detail.
 */
import type { AchievementStats, Activity, BuildAchievementStatsInput } from "../types.js";

const isConfirmedByEither = (activity: Activity, userId: string, partnerId: string): boolean => {
  const myStatus = activity.selections?.[userId]?.status;
  const partnerStatus = activity.selections?.[partnerId]?.status;
  return myStatus === "confirmed" || partnerStatus === "confirmed";
};

const isConfirmedByBoth = (activity: Activity, userId: string, partnerId: string): boolean => {
  const myStatus = activity.selections?.[userId]?.status;
  const partnerStatus = activity.selections?.[partnerId]?.status;
  return myStatus === "confirmed" && partnerStatus === "confirmed";
};

const isChallenge = (activity: Activity): boolean => Boolean(activity.type?.startsWith("desafio"));
const isHot = (activity: Activity): boolean => activity.category === "Hot";

export const buildAchievementStats = ({
  userId,
  partnerId,
  allActivities = [],
  coupleData = {},
  rewards = [],
  wishlistItems = [],
}: BuildAchievementStatsInput): AchievementStats => {
  const completedChallenges = allActivities.filter(
    (activity) => isChallenge(activity) && isConfirmedByEither(activity, userId, partnerId),
  ).length;
  const completedDailyChallenges = coupleData.dailyChallengeCompletions ?? 0;

  const completedActivities = allActivities.filter((activity) =>
    isConfirmedByBoth(activity, userId, partnerId),
  ).length;

  const completedHotActivities = allActivities.filter(
    (activity) => isConfirmedByBoth(activity, userId, partnerId) && isHot(activity),
  ).length;

  const completedHotChallenges = allActivities.filter(
    (activity) =>
      isChallenge(activity) && isHot(activity) && isConfirmedByEither(activity, userId, partnerId),
  ).length;

  // Points spent: summed live from purchased rewards rather than a redundant
  // stored counter, so the total can never drift out of date.
  const totalPointsSpent = rewards
    .filter((reward) => reward.status === "purchased")
    .reduce((sum, reward) => sum + (reward.cost ?? 0), 0);

  const wishlistItemsGifted = wishlistItems.filter(
    (item) => item.status === "gifted" || item.status === "confirmed",
  ).length;

  return {
    totalChallengesCompleted: completedChallenges + completedDailyChallenges,
    completedActivities,
    completedHotActivities,
    completedHotChallenges,
    currentStreak: coupleData.streak ?? 0,
    messagesSent: coupleData.messageCount ?? 0,
    totalPointsSpent,
    wishlistItemsGifted,
  };
};
