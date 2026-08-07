import { describe, expect, it } from "vitest";

import type { Activity, Round } from "../types.js";

import { evaluateCyclicalRules, findActiveRound } from "./round-rules-evaluator.js";

const round = (overrides: Partial<Round> = {}): Round => ({
  id: "r1",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  ...overrides,
});

describe("findActiveRound", () => {
  it("returns the round whose range contains today", () => {
    const r = round();
    expect(findActiveRound([r], "2026-01-15")).toBe(r);
  });

  it("returns null when no round's range contains today", () => {
    expect(findActiveRound([round()], "2026-02-01")).toBeNull();
  });

  it("treats the round's start and end dates as inclusive boundaries", () => {
    const r = round();
    expect(findActiveRound([r], "2026-01-01")).toBe(r);
    expect(findActiveRound([r], "2026-01-31")).toBe(r);
  });
});

describe("evaluateCyclicalRules", () => {
  const baseArgs = {
    allActivities: [] as Activity[],
    userId: "u1",
    partnerId: "u2",
    todayStr: "2026-01-10",
  };

  it("returns null when there is no active round", () => {
    expect(evaluateCyclicalRules({ ...baseArgs, activeRound: null })).toBeNull();
  });

  it("returns null when the active round has no rules configured", () => {
    expect(evaluateCyclicalRules({ ...baseArgs, activeRound: round() })).toBeNull();
  });

  it("returns null when a configured rule is not yet due", () => {
    const activeRound = round({
      rules: { minActivities: { days: 7, quantity: 2, penalty: 10 } },
      rulesLastChecked: { activities: "2026-01-09" },
    });
    expect(evaluateCyclicalRules({ ...baseArgs, activeRound })).toBeNull();
  });

  const confirmedActivity = (userId: string, date: string): Activity => ({
    createdAt: date,
    selections: { [userId]: { status: "confirmed", date } },
  });

  it("penalizes the partner who did not meet the goal", () => {
    const activeRound = round({
      rules: { minActivities: { days: 1, quantity: 1, penalty: 10 } },
      rulesLastChecked: { activities: "2026-01-01" },
    });
    const result = evaluateCyclicalRules({
      ...baseArgs,
      activeRound,
      allActivities: [confirmedActivity("u1", "2026-01-05")],
    });
    expect(result?.scoreDeltas).toEqual({ u1: 10, u2: -10 });
    expect(result?.lastCheckedUpdates).toEqual({ activities: "2026-01-10" });
  });

  it("inverts the penalty when the partner meets the goal instead", () => {
    const activeRound = round({
      rules: { minActivities: { days: 1, quantity: 1, penalty: 10 } },
      rulesLastChecked: { activities: "2026-01-01" },
    });
    const result = evaluateCyclicalRules({
      ...baseArgs,
      activeRound,
      allActivities: [confirmedActivity("u2", "2026-01-05")],
    });
    expect(result?.scoreDeltas).toEqual({ u1: -10, u2: 10 });
  });

  it("applies no penalty when both meet the goal, but still marks the rule checked", () => {
    const activeRound = round({
      rules: { minActivities: { days: 1, quantity: 1, penalty: 10 } },
      rulesLastChecked: { activities: "2026-01-01" },
    });
    const result = evaluateCyclicalRules({
      ...baseArgs,
      activeRound,
      allActivities: [confirmedActivity("u1", "2026-01-05"), confirmedActivity("u2", "2026-01-05")],
    });
    expect(result?.scoreDeltas).toEqual({});
    expect(result?.lastCheckedUpdates).toEqual({ activities: "2026-01-10" });
  });

  it("applies no penalty when neither meets the goal, but still marks the rule checked", () => {
    const activeRound = round({
      rules: { minActivities: { days: 1, quantity: 5, penalty: 10 } },
      rulesLastChecked: { activities: "2026-01-01" },
    });
    const result = evaluateCyclicalRules({ ...baseArgs, activeRound });
    expect(result?.scoreDeltas).toEqual({});
    expect(result?.lastCheckedUpdates).toEqual({ activities: "2026-01-10" });
  });

  it("additively merges deltas when both rules are due with opposite outcomes", () => {
    const activeRound = round({
      rules: {
        minActivities: { days: 1, quantity: 1, penalty: 10 },
        minChallenges: { days: 1, quantity: 1, penalty: 5 },
      },
      rulesLastChecked: { activities: "2026-01-01", challenges: "2026-01-01" },
    });
    const challenge: Activity = {
      type: "desafio",
      createdBy: "u2",
      createdAt: "2026-01-05",
    };
    const result = evaluateCyclicalRules({
      ...baseArgs,
      activeRound,
      allActivities: [confirmedActivity("u1", "2026-01-05"), challenge],
    });
    // u1 meets activities (u1: +10, u2: -10); u2 meets challenges (u1: -5, u2: +5)
    expect(result?.scoreDeltas).toEqual({ u1: 5, u2: -5 });
    expect(result?.lastCheckedUpdates).toEqual({
      activities: "2026-01-10",
      challenges: "2026-01-10",
    });
  });

  it("excludes an activity created before the round started even if its selection date falls inside the round", () => {
    const activeRound = round({
      startDate: "2026-01-10",
      endDate: "2026-01-31",
      rules: { minActivities: { days: 1, quantity: 1, penalty: 10 } },
      rulesLastChecked: { activities: "2026-01-10" },
    });
    const staleActivity: Activity = {
      createdAt: "2026-01-05",
      selections: { u1: { status: "confirmed", date: "2026-01-15" } },
    };
    const result = evaluateCyclicalRules({
      ...baseArgs,
      todayStr: "2026-01-20",
      activeRound,
      allActivities: [staleActivity],
    });
    // neither partner met the goal, since the only activity predates the round
    expect(result?.scoreDeltas).toEqual({});
  });

  it("excludes challenges created by someone other than the evaluated user", () => {
    const activeRound = round({
      rules: { minChallenges: { days: 1, quantity: 1, penalty: 5 } },
      rulesLastChecked: { challenges: "2026-01-01" },
    });
    const partnerChallenge: Activity = {
      type: "desafio",
      createdBy: "u2",
      createdAt: "2026-01-05",
    };
    const result = evaluateCyclicalRules({
      ...baseArgs,
      activeRound,
      allActivities: [partnerChallenge],
    });
    // u2 created it and meets the goal, u1 does not -> u1 penalized
    expect(result?.scoreDeltas).toEqual({ u1: -5, u2: 5 });
  });
});
