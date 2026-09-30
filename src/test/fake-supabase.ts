import type { VitrinaSupabaseClient } from '@/core/supabase';

interface Result {
  data: unknown;
  error: unknown;
}

export interface FakeSupabase {
  client: VitrinaSupabaseClient;
  /** Every chained call on a query builder, in order: ['from', 'products'], ['eq', 'id', '1']... */
  calls: unknown[][];
  /**
   * Sets the results returned by successive awaited queries. The last one repeats.
   * An Error makes the call reject (e.g. TypeError('Network request failed')).
   */
  respond: (...results: (Partial<Result> | Error)[]) => void;
  /** Buckets asked for with `client.storage.from(bucket)`. */
  buckets: string[];
}

/**
 * Chainable fake of the supabase-js client. Any method on a query builder returns the same
 * (thenable) proxy, which resolves to the configured `{ data, error }`.
 * `storage.from(bucket).getPublicUrl(path)` returns `https://storage.test/<bucket>/<path>`.
 */
export function createFakeSupabase(): FakeSupabase {
  const calls: unknown[][] = [];
  const buckets: string[] = [];
  let queue: (Result | Error)[] = [{ data: null, error: null }];

  const settle = (): Promise<Result> => {
    const next = (queue.length > 1 ? queue.shift() : queue[0]) as Result | Error;
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  };

  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (onFulfilled: (r: Result) => unknown, onRejected: (e: unknown) => unknown) =>
            settle().then(onFulfilled, onRejected);
        }
        return (...args: unknown[]) => {
          calls.push([String(prop), ...args]);
          return builder;
        };
      },
    },
  );

  const client = {
    from: (table: string) => {
      calls.push(['from', table]);
      return builder;
    },
    storage: {
      from: (bucket: string) => {
        buckets.push(bucket);
        return {
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://storage.test/${bucket}/${path}` },
          }),
        };
      },
    },
  } as unknown as VitrinaSupabaseClient;

  return {
    client,
    calls,
    buckets,
    respond: (...results) => {
      queue = results.map((r) => (r instanceof Error ? r : { data: null, error: null, ...r }));
    },
  };
}
