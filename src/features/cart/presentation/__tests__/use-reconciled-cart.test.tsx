import { act, waitFor } from '@testing-library/react-native';

import { MockStore } from '@/features/demo/data/mock-store';
import { renderWithProviders } from '@/test/render-with-providers';

import { useCartStore } from '../cart.store';
import { useReconciledCart } from '../hooks/use-reconciled-cart';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

function setup() {
  const store = new MockStore({ latencyMs: [0, 0] });
  const [p1, p2] = store.products.filter((p) => p.stock >= 5) as [
    (typeof store.products)[number],
    (typeof store.products)[number],
  ];
  useCartStore.setState({ items: [] });
  useCartStore.getState().add(p1, 3);
  useCartStore.getState().add(p2, 1);
  return { store, p1, p2 };
}

const render = (store: MockStore) => renderWithProviders(<Probe />, { store });

const latest = {} as ReturnType<typeof useReconciledCart>;
function Probe() {
  Object.assign(latest, useReconciledCart());
  return null;
}

describe('useReconciledCart', () => {
  it('reports ok with no notices when nothing changed', async () => {
    const { store } = setup();
    await render(store);
    await waitFor(() => expect(latest.status).toBe('ok'));
    expect(latest.notices).toEqual([]);
    expect(latest.items).toHaveLength(2);
  });

  it('updates the snapshot and warns when the price changed', async () => {
    const { store, p1 } = setup();
    store.products.find((p) => p.id === p1.id)!.priceCents = 12345;
    await render(store);
    await waitFor(() => expect(latest.notices).toHaveLength(1));
    expect(latest.notices[0]).toMatchObject({ type: 'priceChanged', toCents: 12345 });
    expect(useCartStore.getState().items[0]?.snapshot.priceCents).toBe(12345);
  });

  it('adjusts the quantity when the stock dropped', async () => {
    const { store, p1 } = setup();
    store.products.find((p) => p.id === p1.id)!.stock = 1;
    await render(store);
    await waitFor(() => expect(latest.notices).toHaveLength(1));
    expect(latest.notices[0]).toMatchObject({ type: 'quantityAdjusted', from: 3, to: 1 });
    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
  });

  it('removes products that no longer exist, with a notice', async () => {
    const { store, p2 } = setup();
    store.products = store.products.filter((p) => p.id !== p2.id);
    await render(store);
    await waitFor(() => expect(latest.notices).toHaveLength(1));
    expect(latest.notices[0]).toMatchObject({ type: 'removed', reason: 'unavailable' });
    expect(useCartStore.getState().items.map((i) => i.productId)).not.toContain(p2.id);
  });

  it('goes offline on a network error and leaves the cart alone', async () => {
    const { store } = setup();
    const before = useCartStore.getState().items;
    store.failNext({ code: 'network' });
    await render(store);
    await waitFor(() => expect(latest.status).toBe('offline'));
    expect(useCartStore.getState().items).toBe(before);
    expect(latest.notices).toEqual([]);
  });

  it('dismisses a notice', async () => {
    const { store, p1 } = setup();
    store.products.find((p) => p.id === p1.id)!.priceCents = 999;
    await render(store);
    await waitFor(() => expect(latest.notices).toHaveLength(1));
    await act(async () => latest.dismissNotice(0));
    expect(latest.notices).toEqual([]);
  });

  it('does nothing for an empty cart', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    useCartStore.setState({ items: [] });
    await render(store);
    expect(latest.status).toBe('ok');
  });
});
