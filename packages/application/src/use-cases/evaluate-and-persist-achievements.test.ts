import { describe, expect, it } from "vitest";

import type {
  AchievementInputs,
  AchievementsRepository,
} from "../ports/achievements-repository.js";

import { evaluateAndPersistAchievements } from "./evaluate-and-persist-achievements.js";

class FakeAchievementsRepository implements AchievementsRepository {
  currentAchievements: string[];
  persistCalls: string[][] = [];

  constructor(
    private readonly statsInput: Omit<AchievementInputs, "currentAchievements">,
    initialAchievements: string[] = [],
  ) {
    this.currentAchievements = initialAchievements;
  }

  async loadAchievementInputs(): Promise<AchievementInputs> {
    return { ...this.statsInput, currentAchievements: this.currentAchievements };
  }

  async persistUnlockedAchievements(
    _coupleId: string,
    achievementIds: readonly string[],
  ): Promise<void> {
    this.persistCalls.push([...achievementIds]);
    this.currentAchievements = [...this.currentAchievements, ...achievementIds];
  }
}

const baseInputs = { userId: "u1", partnerId: "u2" };
const bothConfirmed = {
  allActivities: [{ selections: { u1: { status: "confirmed" }, u2: { status: "confirmed" } } }],
};

describe("evaluateAndPersistAchievements", () => {
  it("persists nothing when no threshold is met", async () => {
    const repo = new FakeAchievementsRepository(baseInputs);

    const result = await evaluateAndPersistAchievements(repo, "couple-1");

    expect(result).toEqual([]);
    expect(repo.persistCalls).toEqual([]);
  });

  it("persists a newly unlocked achievement", async () => {
    const repo = new FakeAchievementsRepository({ ...baseInputs, ...bothConfirmed });

    const result = await evaluateAndPersistAchievements(repo, "couple-1");

    expect(result).toEqual(expect.arrayContaining(["first_activity", "first_match"]));
    expect(repo.persistCalls).toHaveLength(1);
    expect(repo.persistCalls[0]).toEqual(expect.arrayContaining(["first_activity", "first_match"]));
  });

  it("does not re-persist an achievement already recorded as unlocked", async () => {
    const repo = new FakeAchievementsRepository({ ...baseInputs, ...bothConfirmed }, [
      "first_activity",
      "first_match",
    ]);

    const result = await evaluateAndPersistAchievements(repo, "couple-1");

    expect(result).toEqual([]);
    expect(repo.persistCalls).toEqual([]);
  });

  it("re-running with unchanged data produces no writes on the second run", async () => {
    const repo = new FakeAchievementsRepository({ ...baseInputs, ...bothConfirmed });

    const first = await evaluateAndPersistAchievements(repo, "couple-1");
    expect(first.length).toBeGreaterThan(0);
    expect(repo.persistCalls).toHaveLength(1);

    const second = await evaluateAndPersistAchievements(repo, "couple-1");
    expect(second).toEqual([]);
    expect(repo.persistCalls).toHaveLength(1);
  });
});
