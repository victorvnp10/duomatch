import type { Activity, CyclicalRulesResult, Round } from "@duomatch/domain";
import { describe, expect, it } from "vitest";

import type { RoundRuleInputs, RoundRulesRepository } from "../ports/round-rules-repository.js";

import { evaluateAndPersistRoundRules } from "./evaluate-and-persist-round-rules.js";

class FakeRoundRulesRepository implements RoundRulesRepository {
  persistCalls: Array<{ roundId: string; result: CyclicalRulesResult }> = [];

  constructor(private readonly inputs: RoundRuleInputs) {}

  async loadRoundRuleInputs(): Promise<RoundRuleInputs> {
    return this.inputs;
  }

  async persistRoundRuleAdjustment(roundId: string, result: CyclicalRulesResult): Promise<void> {
    this.persistCalls.push({ roundId, result });
  }
}

const round = (overrides: Partial<Round> = {}): Round => ({
  id: "r1",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  ...overrides,
});

describe("evaluateAndPersistRoundRules", () => {
  it("returns null and persists nothing when there is no active round", async () => {
    const repo = new FakeRoundRulesRepository({
      userId: "u1",
      partnerId: "u2",
      rounds: [],
      allActivities: [],
    });

    const result = await evaluateAndPersistRoundRules(repo, "couple-1", "2026-01-10");

    expect(result).toBeNull();
    expect(repo.persistCalls).toEqual([]);
  });

  it("returns null and persists nothing when the rule is not yet due", async () => {
    const repo = new FakeRoundRulesRepository({
      userId: "u1",
      partnerId: "u2",
      rounds: [
        round({
          rules: { minActivities: { days: 7, quantity: 2, penalty: 10 } },
          rulesLastChecked: { activities: "2026-01-09" },
        }),
      ],
      allActivities: [],
    });

    const result = await evaluateAndPersistRoundRules(repo, "couple-1", "2026-01-10");

    expect(result).toBeNull();
    expect(repo.persistCalls).toEqual([]);
  });

  it("persists the score adjustment for a due rule against the active round's id", async () => {
    const activeRound = round({
      rules: { minActivities: { days: 1, quantity: 1, penalty: 10 } },
      rulesLastChecked: { activities: "2026-01-01" },
    });
    const confirmedActivity: Activity = {
      createdAt: "2026-01-05",
      selections: { u1: { status: "confirmed", date: "2026-01-05" } },
    };
    const repo = new FakeRoundRulesRepository({
      userId: "u1",
      partnerId: "u2",
      rounds: [activeRound],
      allActivities: [confirmedActivity],
    });

    const result = await evaluateAndPersistRoundRules(repo, "couple-1", "2026-01-10");

    expect(result?.scoreDeltas).toEqual({ u1: 10, u2: -10 });
    expect(repo.persistCalls).toEqual([{ roundId: "r1", result }]);
  });
});
