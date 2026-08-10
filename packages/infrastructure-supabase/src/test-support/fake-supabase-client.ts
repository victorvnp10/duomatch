import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimal fake standing in for supabase-js's chainable, thenable PostgREST
 * query builder (design.md - Migration Plan step 3: "mocked PostgREST
 * responses"). Only implements the chain shapes the adapters under test
 * actually call: `.select().eq()[.single()]`, `.upsert()`, `.rpc()`,
 * `.auth.getUser()`. Ignores filter arguments — each table's response is
 * pre-configured per test, so there's nothing to filter.
 */
export interface TableResponse {
  data: unknown;
  error: unknown;
}

class FakeQueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
  constructor(
    private readonly table: string,
    private readonly response: TableResponse,
    private readonly upsertCalls: Array<{ table: string; rows: unknown; options: unknown }>,
  ) {}

  select(): this {
    return this;
  }

  eq(): this {
    return this;
  }

  single(): Promise<{ data: unknown; error: unknown }> {
    const data = Array.isArray(this.response.data)
      ? (this.response.data[0] ?? null)
      : this.response.data;
    return Promise.resolve({ data, error: this.response.error });
  }

  upsert(rows: unknown, options?: unknown): Promise<{ data: null; error: unknown }> {
    this.upsertCalls.push({ table: this.table, rows, options });
    return Promise.resolve({ data: null, error: this.response.error });
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected);
  }
}

export interface FakeSupabaseClientOptions {
  userId: string;
  tables: Record<string, TableResponse>;
  rpcResult?: { data: unknown; error: unknown };
}

export interface FakeSupabaseHandle {
  client: SupabaseClient;
  rpcCalls: Array<{ name: string; params: Record<string, unknown> }>;
  upsertCalls: Array<{ table: string; rows: unknown; options: unknown }>;
}

export const createFakeSupabaseClient = (
  options: FakeSupabaseClientOptions,
): FakeSupabaseHandle => {
  const rpcCalls: Array<{ name: string; params: Record<string, unknown> }> = [];
  const upsertCalls: Array<{ table: string; rows: unknown; options: unknown }> = [];

  const fake = {
    auth: {
      getUser: async () => ({ data: { user: { id: options.userId } }, error: null }),
    },
    from: (table: string) => {
      const response = options.tables[table] ?? { data: null, error: null };
      return new FakeQueryBuilder(table, response, upsertCalls);
    },
    rpc: (name: string, params: Record<string, unknown>) => {
      rpcCalls.push({ name, params });
      return Promise.resolve(options.rpcResult ?? { data: null, error: null });
    },
  };

  return { client: fake as unknown as SupabaseClient, rpcCalls, upsertCalls };
};
