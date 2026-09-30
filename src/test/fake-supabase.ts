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
  /** Simulates a GoTrue state change for the `onAuthStateChange` listeners. */
  emitAuthChange: (event: string, session: unknown) => void;
  /** Number of `onAuthStateChange` subscriptions that were not unsubscribed. */
  activeAuthListeners: () => number;
}

/**
 * Chainable fake of the supabase-js client. Any method on a query builder returns the same
 * (thenable) proxy, which resolves to the configured `{ data, error }`.
 * `storage.from(bucket).getPublicUrl(path)` returns `https://storage.test/<bucket>/<path>`.
 * `rpc(name, args)` and the `auth.*` methods are recorded in `calls` (as `['rpc', name, args]` and
 * `['auth.verifyOtp', args]`) and resolve to the same configured result.
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

  const authListeners = new Set<(event: string, session: unknown) => void>();

  const authMethod =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([`auth.${name}`, ...args]);
      return builder;
    };

  const client = {
    rpc: (fn: string, args?: unknown) => {
      calls.push(['rpc', fn, args]);
      return builder;
    },
    auth: {
      signInWithOtp: authMethod('signInWithOtp'),
      verifyOtp: authMethod('verifyOtp'),
      signOut: authMethod('signOut'),
      getSession: authMethod('getSession'),
      onAuthStateChange: (listener: (event: string, session: unknown) => void) => {
        authListeners.add(listener);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } };
      },
    },
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
    emitAuthChange: (event, session) => authListeners.forEach((l) => l(event, session)),
    activeAuthListeners: () => authListeners.size,
    respond: (...results) => {
      queue = results.map((r) => (r instanceof Error ? r : { data: null, error: null, ...r }));
    },
  };
}
