import { describe, expect, it } from "vitest";

import { SupabaseRoundRulesRepository } from "./supabase-round-rules-repository.js";
import { createFakeSupabaseClient } from "./test-support/fake-supabase-client.js";

const coupleId = "couple-1";

const coupleRow = { member_a: "u1", member_b: "u2" };

const roundRow = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  start_date: "2026-01-01",
  end_date: "2026-01-31",
  min_activities_days: null,
  min_activities_quantity: null,
  min_activities_penalty: null,
  min_challenges_days: null,
  min_challenges_quantity: null,
  min_challenges_penalty: null,
  activities_last_checked: null,
  challenges_last_checked: null,
  ...overrides,
});

describe("SupabaseRoundRulesRepository", () => {
  it("loads round-rule inputs mapped from couple-scoped rows", async () => {
    const { client } = createFakeSupabaseClient({
      userId: "u1",
      tables: {
        couples: { data: coupleRow, error: null },
        rounds: {
          data: [
            roundRow({
              min_activities_days: 7,
              min_activities_quantity: 2,
              min_activities_penalty: 10,
              activities_last_checked: "2026-01-01",
            }),
          ],
          error: null,
        },
        activities: {
          data: [
            {
              type: null,
              category: null,
              created_by: "u1",
              created_at: "2026-01-05",
              activity_selections: [
                { user_id: "u1", status: "confirmed", selection_date: "2026-01-05" },
              ],
            },
          ],
          error: null,
        },
      },
    });

    const repository = new SupabaseRoundRulesRepository(client);
    const inputs = await repository.loadRoundRuleInputs(coupleId);

    expect(inputs.userId).toBe("u1");
    expect(inputs.partnerId).toBe("u2");
    expect(inputs.rounds).toEqual([
      {
        id: "r1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        rules: { minActivities: { days: 7, quantity: 2, penalty: 10 } },
        rulesLastChecked: { activities: "2026-01-01" },
      },
    ]);
    expect(inputs.allActivities).toEqual([
      {
        createdBy: "u1",
        createdAt: "2026-01-05",
        selections: { u1: { status: "confirmed", date: "2026-01-05" } },
      },
    ]);
  });

  it("persists a round-rule adjustment through the apply_round_rule_adjustment RPC", async () => {
    const { client, rpcCalls } = createFakeSupabaseClient({
      userId: "u1",
      tables: {},
      rpcResult: { data: null, error: null },
    });
    const repository = new SupabaseRoundRulesRepository(client);

    await repository.persistRoundRuleAdjustment("r1", {
      scoreDeltas: { u1: 10, u2: -10 },
      lastCheckedUpdates: { activities: "2026-01-10" },
    });

    expect(rpcCalls).toEqual([
      {
        name: "apply_round_rule_adjustment",
        params: {
          p_round_id: "r1",
          p_score_deltas: { u1: 10, u2: -10 },
          p_activities_checked_date: "2026-01-10",
          p_challenges_checked_date: null,
        },
      },
    ]);
  });

  it("throws when the RPC reports an error, so a partial adjustment is never silently accepted", async () => {
    const rpcError = new Error("transaction failed");
    const { client } = createFakeSupabaseClient({
      userId: "u1",
      tables: {},
      rpcResult: { data: null, error: rpcError },
    });
    const repository = new SupabaseRoundRulesRepository(client);

    await expect(
      repository.persistRoundRuleAdjustment("r1", {
        scoreDeltas: { u1: 10, u2: -10 },
        lastCheckedUpdates: { activities: "2026-01-10" },
      }),
    ).rejects.toThrow("transaction failed");
  });
});
