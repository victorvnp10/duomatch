/**
 * Domain: Achievements
 *
 * Ported from the legacy DuoMatch app, where the achievement catalog and
 * unlock logic were duplicated across a hook and two UI components with
 * divergent results — three achievements ("big_spender", "hot_streak",
 * "wish_granter") were shown to couples but had no code path that ever
 * granted them, because nothing wrote their ids to the couple's achievement
 * list. This file is the single source of truth for both the catalog and
 * the unlock condition of every achievement; nothing else should
 * reimplement it.
 */
import type { Achievement, AchievementStats } from "../types.js";

export const ACHIEVEMENT_CATALOG: readonly Achievement[] = [
  {
    id: "first_activity",
    title: "Primeira Atividade",
    description: "Completaram a primeira atividade juntos",
    icon: "🎯",
    isUnlocked: (stats) => stats.completedActivities >= 1,
  },
  {
    id: "first_match",
    title: "Primeiro Match",
    description: "Tiveram seu primeiro match em uma atividade",
    icon: "💫",
    isUnlocked: (stats) => stats.completedActivities >= 1,
  },
  {
    id: "first_hot_match",
    title: "Primeiro Match Hot",
    description: "Tiveram seu primeiro match em uma atividade hot",
    icon: "🔥",
    isUnlocked: (stats) => stats.completedHotActivities >= 1,
  },
  {
    id: "first_hot_challenge",
    title: "Primeiro Desafio Hot",
    description: "Completaram seu primeiro desafio hot",
    icon: "🌶️",
    isUnlocked: (stats) => stats.completedHotChallenges >= 1,
  },
  {
    id: "first_challenge",
    title: "Primeiro Desafio",
    description: "Completaram o primeiro desafio diário",
    icon: "🏆",
    isUnlocked: (stats) => stats.totalChallengesCompleted >= 1,
  },
  {
    id: "challenge_streak_5",
    title: "Desafiadores",
    description: "Completaram 5 desafios",
    icon: "🎖️",
    isUnlocked: (stats) => stats.totalChallengesCompleted >= 5,
  },
  {
    id: "challenge_master",
    title: "Mestres dos Desafios",
    description: "Completaram 10 desafios",
    icon: "👑",
    isUnlocked: (stats) => stats.totalChallengesCompleted >= 10,
  },
  {
    id: "streak_7",
    title: "Uma Semana Forte",
    description: "Mantiveram uma sequência de 7 dias",
    icon: "🔥",
    isUnlocked: (stats) => stats.currentStreak >= 7,
  },
  {
    id: "communicator",
    title: "Super Comunicativo",
    description: "Enviaram 50 mensagens no chat",
    icon: "💬",
    isUnlocked: (stats) => stats.messagesSent >= 50,
  },
  {
    id: "big_spender",
    title: "Grande Gastador",
    description: "Gastaram 100 pontos na loja",
    icon: "💰",
    isUnlocked: (stats) => stats.totalPointsSpent >= 100,
  },
  {
    id: "hot_streak",
    title: "Esquentando",
    description: "Completaram 5 atividades da Hot Zone",
    icon: "🌶️",
    isUnlocked: (stats) => stats.completedHotActivities >= 5,
  },
  {
    id: "wish_granter",
    title: "Realizador de Sonhos",
    description: "Compraram 3 itens da lista de desejos",
    icon: "⭐",
    isUnlocked: (stats) => stats.wishlistItemsGifted >= 3,
  },
];

export const getAchievementById = (id: string): Achievement | null =>
  ACHIEVEMENT_CATALOG.find((achievement) => achievement.id === id) ?? null;

/**
 * Given a statistics snapshot and the couple's currently-granted achievement
 * ids, returns exactly the ids newly unlocked by this snapshot. Pure: no
 * side effects, no datastore access.
 */
export const evaluateNewAchievements = (
  stats: AchievementStats,
  currentAchievements: readonly string[] = [],
): string[] =>
  ACHIEVEMENT_CATALOG.filter(
    (achievement) => !currentAchievements.includes(achievement.id) && achievement.isUnlocked(stats),
  ).map((achievement) => achievement.id);
