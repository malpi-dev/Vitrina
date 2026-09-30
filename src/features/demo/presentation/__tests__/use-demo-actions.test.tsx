import { act, renderHook } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { MockStore } from '@/features/demo/data/mock-store';
import { useCartStore } from '@/features/cart/presentation/cart.store';

import { useDemoActions } from '../hooks/use-demo-actions';

jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

describe('useDemoActions', () => {
  beforeEach(() => {
    useSessionStore.setState({ hasSeenWelcome: true, isDemo: false, demoSessionId: 0 });
    const product = new MockStore({ latencyMs: [0, 0] }).products.find((p) => p.stock >= 5)!;
    useCartStore.setState({ items: [] });
    useCartStore.getState().add(product, 1);
  });

  it('enterDemo empties the cart and starts a demo session', async () => {
    const { result } = await renderHook(() => useDemoActions());
    await act(async () => result.current.enterDemo());
    expect(useCartStore.getState().items).toEqual([]);
    expect(useSessionStore.getState().isDemo).toBe(true);
  });

  it('exitDemo empties the cart', async () => {
    useSessionStore.setState({ isDemo: true });
    const { result } = await renderHook(() => useDemoActions());
    await act(async () => result.current.exitDemo());
    expect(useCartStore.getState().items).toEqual([]);
    expect(useSessionStore.getState().isDemo).toBe(false);
  });
});
