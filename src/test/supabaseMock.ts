// Shared mock for the supabase client module. Usage in a test file:
//
//   vi.mock("@/integrations/supabase/client", async () => {
//     const m = await import("../test/supabaseMock");
//     return { supabase: m.mockSupabaseClient() };
//   });
//
// Then configure per test with queueTableResult()/setTableResult() and inspect
// recorded calls with fromCalls. Because this module itself is NOT mocked, the
// test file and the mock factory share the same instance.
import { vi } from "vitest";

export type TableResult = {
  data?: unknown;
  error?: { message: string } | null;
  /** Resolve after this many ms — for testing response-ordering races. */
  delayMs?: number;
};

type RecordedQuery = { table: string; methods: Array<[string, unknown[]]> };

const queues = new Map<string, TableResult[]>();
const defaults = new Map<string, TableResult>();
export const fromCalls: RecordedQuery[] = [];

/** Queue a one-shot result for the next query against `table` (FIFO). */
export function queueTableResult(table: string, result: TableResult) {
  if (!queues.has(table)) queues.set(table, []);
  queues.get(table)!.push(result);
}

/** Set the fallback result for every query against `table` with no queued result. */
export function setTableResult(table: string, result: TableResult) {
  defaults.set(table, result);
}

export function resetSupabaseMock() {
  queues.clear();
  defaults.clear();
  fromCalls.length = 0;
}

/** All recorded queries against a table, e.g. to assert no DELETE was issued. */
export function callsFor(table: string): RecordedQuery[] {
  return fromCalls.filter((c) => c.table === table);
}

function makeQuery(table: string) {
  const record: RecordedQuery = { table, methods: [] };
  fromCalls.push(record);
  const proxy: object = new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === "then") {
          const queued = queues.get(table);
          const result = queued?.length ? queued.shift()! : defaults.get(table) ?? {};
          return (resolve: (v: unknown) => void) => {
            const respond = () => resolve({ data: result.data ?? null, error: result.error ?? null });
            if (result.delayMs) setTimeout(respond, result.delayMs);
            else respond();
          };
        }
        return (...args: unknown[]) => {
          record.methods.push([prop, args]);
          return proxy;
        };
      },
    }
  );
  return proxy;
}

export function mockSupabaseClient() {
  return {
    from: vi.fn((table: string) => makeQuery(table)),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  };
}
