/**
 * Shared types for the achievement and round-rules domain modules. Kept in
 * one file because `AchievementStats` is produced by
 * `services/achievement-stats-builder.ts` and consumed by
 * `entities/achievement.ts` — a single source avoids an awkward cross-import
 * between the two for a handful of small interfaces.
 */

export interface AchievementStats {
  totalChallengesCompleted: number;
  completedActivities: number;
  completedHotActivities: number;
  completedHotChallenges: number;
  currentStreak: number;
  messagesSent: number;
  totalPointsSpent: number;
  wishlistItemsGifted: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: (stats: AchievementStats) => boolean;
}

export interface ActivitySelection {
  status: string;
  date?: string;
}

export interface Activity {
  type?: string;
  category?: string;
  createdBy?: string;
  createdAt?: string | { toDate: () => Date };
  selections?: Record<string, ActivitySelection>;
}

export interface CoupleData {
  dailyChallengeCompletions?: number;
  streak?: number;
  messageCount?: number;
}

export interface Reward {
  status: string;
  cost?: number;
}

export interface WishlistItem {
  status: string;
}

export interface BuildAchievementStatsInput {
  userId: string;
  partnerId: string;
  allActivities?: Activity[];
  coupleData?: CoupleData;
  rewards?: Reward[];
  wishlistItems?: WishlistItem[];
}

export interface RoundRule {
  days: number;
  quantity: number;
  penalty: number;
}

export interface RulesLastChecked {
  activities?: string;
  challenges?: string;
}

export interface Round {
  id: string;
  startDate: string;
  endDate: string;
  rules?: {
    minActivities?: RoundRule;
    minChallenges?: RoundRule;
  };
  rulesLastChecked?: RulesLastChecked;
}

export interface EvaluateCyclicalRulesInput {
  activeRound: Round | null;
  allActivities: Activity[];
  userId: string;
  partnerId: string;
  todayStr: string;
}

export interface CyclicalRulesResult {
  scoreDeltas: Record<string, number>;
  lastCheckedUpdates: Partial<Record<"activities" | "challenges", string>>;
}
