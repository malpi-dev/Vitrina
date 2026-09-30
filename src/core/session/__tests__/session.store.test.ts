const STORAGE_KEY = 'vitrina-session';

interface Loaded {
  useSessionStore: typeof import('../session.store').useSessionStore;
  queryClient: typeof import('@/core/query').queryClient;
  storage: typeof import('@react-native-async-storage/async-storage').default;
}
const loaded: Loaded[] = [];

/** Fresh module graph per test: `isDemoForced` is a module constant and AsyncStorage is mocked in memory. */
function loadStore(forced: boolean): Loaded {
  jest.resetModules();
  jest.doMock('@/core/config/env', () => ({ isDemoForced: forced, env: {} }));
  /* eslint-disable @typescript-eslint/no-require-imports -- require() is needed to get a fresh module graph */
  const storageModule = require('@react-native-async-storage/async-storage');
  const storage: Loaded['storage'] = storageModule.default ?? storageModule;
  const { useSessionStore } = require('../session.store') as typeof import('../session.store');
  const { queryClient } = require('@/core/query') as typeof import('@/core/query');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const result = { useSessionStore, queryClient, storage };
  loaded.push(result);
  return result;
}

describe('session store', () => {
  afterEach(() => {
    // Query cache entries schedule GC timers that would keep the Jest process alive.
    for (const { queryClient } of loaded.splice(0)) queryClient.clear();
  });

  it('starts outside demo without having seen the welcome', async () => {
    const { useSessionStore } = loadStore(false);
    expect(useSessionStore.getState()).toMatchObject({
      hasSeenWelcome: false,
      isDemo: false,
      demoSessionId: 0,
    });
  });

  it('enterDemo enables demo, marks the welcome as seen, bumps the session and clears the cache', async () => {
    const { useSessionStore, queryClient } = loadStore(false);
    queryClient.setQueryData(['products'], [1]);
    useSessionStore.getState().enterDemo();
    expect(useSessionStore.getState()).toMatchObject({
      isDemo: true,
      hasSeenWelcome: true,
      demoSessionId: 1,
    });
    expect(queryClient.getQueryData(['products'])).toBeUndefined();
    useSessionStore.getState().enterDemo();
    expect(useSessionStore.getState().demoSessionId).toBe(2);
  });

  it('exitDemo leaves demo and clears the cache', async () => {
    const { useSessionStore, queryClient } = loadStore(false);
    useSessionStore.getState().enterDemo();
    queryClient.setQueryData(['orders'], [1]);
    useSessionStore.getState().exitDemo();
    expect(useSessionStore.getState().isDemo).toBe(false);
    expect(useSessionStore.getState().hasSeenWelcome).toBe(true);
    expect(queryClient.getQueryData(['orders'])).toBeUndefined();
  });

  it('exitDemo does nothing when demo is forced', async () => {
    const { useSessionStore, queryClient } = loadStore(true);
    useSessionStore.setState({ isDemo: true });
    queryClient.setQueryData(['orders'], [1]);
    useSessionStore.getState().exitDemo();
    expect(useSessionStore.getState().isDemo).toBe(true);
    expect(queryClient.getQueryData(['orders'])).toEqual([1]);
  });

  it('persists only hasSeenWelcome and isDemo', async () => {
    const { useSessionStore, storage } = loadStore(false);
    useSessionStore.getState().enterDemo();
    const saved = JSON.parse((await storage.getItem(STORAGE_KEY))!);
    expect(saved.version).toBe(1);
    expect(saved.state).toEqual({ hasSeenWelcome: true, isDemo: true });
  });

  it('rehydrates the persisted values but starts demoSessionId at 0', async () => {
    const { useSessionStore, storage } = loadStore(false);
    await storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { hasSeenWelcome: true, isDemo: true }, version: 1 }),
    );
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState()).toMatchObject({
      hasSeenWelcome: true,
      isDemo: true,
      demoSessionId: 0,
    });
  });
});
