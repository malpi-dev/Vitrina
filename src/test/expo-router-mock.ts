import { useEffect, useSyncExternalStore } from 'react';

type Params = Record<string, string | string[] | undefined>;
type Listener = () => void;

let params: Params = {};
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

/** Drops the keys whose value is undefined (like the real router does when a param is removed). */
const compact = (next: Params): Params =>
  Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined));

/**
 * Minimal stand-in for expo-router in screen tests:
 * `jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);`
 * Search params are real state, so `setParams` re-renders the screens that read them.
 */
export const routerMock = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  dismissTo: jest.fn(),
  setParams: jest.fn((next: Params) => {
    params = compact({ ...params, ...next });
    emit();
  }),
  /** Test helper: replaces the current search params. */
  setSearchParams(next: Params) {
    params = compact(next);
    emit();
  },
  reset() {
    params = {};
    for (const fn of [this.push, this.replace, this.back, this.navigate, this.dismissTo]) {
      fn.mockClear();
    }
    this.setParams.mockClear();
  },
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const expoRouterMock = {
  useRouter: () => routerMock,
  useLocalSearchParams: () => useSyncExternalStore(subscribe, () => params),
  /** Runs the effect on mount (the screen is always "focused" in tests). */
  useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  Stack: { Screen: () => null },
  Redirect: () => null,
};
