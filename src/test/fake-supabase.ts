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
  /** Makes `auth.getSession()` resolve to a session for this user (or no session with `null`). */
  setSessionUser: (userId: string | null) => void;
  /** Realtime channels created with `client.channel(name)`, in creation order. */
  channels: FakeChannel[];
  /** Number of `client.realtime.setAuth()` calls. */
  setAuthCalls: () => number;
  /** The next `setAuth()` stays pending until the returned function is called. */
  holdSetAuth: () => () => void;
  /** Makes the next `setAuth()` reject. */
  failSetAuth: () => void;
}

export interface FakeChannel {
  name: string;
  /** Options of the `postgres_changes` listener, e.g. `{ event: '*', schema, table, filter }`. */
  filter: unknown;
  subscribed: boolean;
  removed: boolean;
  /** Simulates a `postgres_changes` event. */
  emitPayload: (payload: unknown) => void;
  /** Simulates a status callback: 'SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'. */
  emitStatus: (status: string) => void;
}

/**
 * Chainable fake of the supabase-js client. Any method on a query builder returns the same
 * (thenable) proxy, which resolves to the configured `{ data, error }`.
 * `storage.from(bucket).getPublicUrl(path)` returns `https://storage.test/<bucket>/<path>`.
 * `channel(name)` / `removeChannel` / `realtime.setAuth()` are recorded in `channels` and `setAuthCalls`.
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

  let sessionUserId: string | null | undefined;
  const channels: FakeChannel[] = [];
  let setAuthCount = 0;
  let setAuthGate: Promise<void> | null = null;
  let setAuthFails = false;

  const client = {
    channel: (name: string) => {
      let onPayload: (payload: unknown) => void = () => undefined;
      let onStatus: (status: string) => void = () => undefined;
      const fake: FakeChannel = {
        name,
        filter: undefined,
        subscribed: false,
        removed: false,
        emitPayload: (payload) => onPayload(payload),
        emitStatus: (status) => onStatus(status),
      };
      channels.push(fake);
      const chain = {
        on: (_type: string, filter: unknown, callback: (payload: unknown) => void) => {
          fake.filter = filter;
          onPayload = callback;
          return chain;
        },
        subscribe: (callback: (status: string) => void) => {
          fake.subscribed = true;
          onStatus = callback;
          return chain;
        },
        fake,
      };
      return chain;
    },
    removeChannel: (chain: { fake: FakeChannel }) => {
      chain.fake.removed = true;
      return Promise.resolve('ok');
    },
    realtime: {
      setAuth: async () => {
        setAuthCount += 1;
        if (setAuthGate) await setAuthGate;
        if (setAuthFails) {
          setAuthFails = false;
          throw new Error('setAuth failed');
        }
      },
    },
    rpc: (fn: string, args?: unknown) => {
      calls.push(['rpc', fn, args]);
      return builder;
    },
    auth: {
      signInWithOtp: authMethod('signInWithOtp'),
      verifyOtp: authMethod('verifyOtp'),
      signOut: authMethod('signOut'),
      getSession: (...args: unknown[]) => {
        if (sessionUserId === undefined) return authMethod('getSession')(...args);
        calls.push(['auth.getSession', ...args]);
        const session = sessionUserId === null ? null : { user: { id: sessionUserId } };
        return Promise.resolve({ data: { session }, error: null });
      },
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
    setSessionUser: (userId) => {
      sessionUserId = userId;
    },
    channels,
    setAuthCalls: () => setAuthCount,
    holdSetAuth: () => {
      let release: () => void = () => undefined;
      setAuthGate = new Promise<void>((resolve) => {
        release = () => {
          setAuthGate = null;
          resolve();
        };
      });
      return release;
    },
    failSetAuth: () => {
      setAuthFails = true;
    },
    respond: (...results) => {
      queue = results.map((r) => (r instanceof Error ? r : { data: null, error: null, ...r }));
    },
  };
}
