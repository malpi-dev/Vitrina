import { act, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { queryKeys } from '@/core/query';
import type { Order } from '../../domain/order';
import type { LiveStatus, OrdersRepository } from '../../domain/orders.repository';
import { MockStore } from '@/features/demo/data/mock-store';
import { renderWithProviders } from '@/test/render-with-providers';

import { useOrderLive } from '../hooks/use-order-live';
import { useOrdersLive } from '../hooks/use-orders-live';

jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

const ID = (n: number) => `00000000-0000-4000-8000-000000000${n}`;

/** A repository whose stream the test drives by hand. */
function controllableRepository(store: MockStore) {
  let emit: (order: Order) => void = () => undefined;
  let setStatus: (status: LiveStatus) => void = () => undefined;
  const subscribe = jest.fn((_filter: { orderId?: string }, onChange, onStatus) => {
    emit = onChange;
    setStatus = onStatus;
    return jest.fn();
  });
  const repository: OrdersRepository = {
    list: () => Promise.resolve(store.orders.map((o) => ({ ...o }))),
    getById: (id) => Promise.resolve({ ...store.orders.find((o) => o.id === id)! }),
    subscribe,
  };
  return {
    repository,
    subscribe,
    emit: (order: Order) => emit(order),
    setStatus: (status: LiveStatus) => setStatus(status),
  };
}

const probe = {} as { latest?: ReturnType<typeof useOrdersLive> };
function ListProbe() {
  Object.assign(probe, { latest: useOrdersLive() });
  return null;
}
function DetailProbe({ id }: { id: string }) {
  Object.assign(probe, { latest: useOrderLive(id) });
  return null;
}

describe('live order hooks', () => {
  beforeEach(() => {
    delete probe.latest;
    useSessionStore.setState({ isDemo: true });
  });

  it('writes a changed order into the detail and the list cache', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const ctl = controllableRepository(store);
    const { queryClient } = await renderWithProviders(<ListProbe />, {
      store,
      repositories: { orders: ctl.repository },
    });
    const original = store.orders.find((o) => o.id === ID(302))!;
    queryClient.setQueryData(
      queryKeys.orders,
      store.orders.map((o) => ({ ...o })),
    );
    const updated = { ...original, status: 'delivered' as const };
    await act(() => ctl.emit(updated));
    expect(queryClient.getQueryData<Order>(queryKeys.order(ID(302)))?.status).toBe('delivered');
    const list = queryClient.getQueryData<Order[]>(queryKeys.orders)!;
    expect(list).toHaveLength(3);
    expect(list.find((o) => o.id === ID(302))?.status).toBe('delivered');
  });

  it('prepends an order that is new to the list', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const ctl = controllableRepository(store);
    const { queryClient } = await renderWithProviders(<ListProbe />, {
      store,
      repositories: { orders: ctl.repository },
    });
    queryClient.setQueryData(
      queryKeys.orders,
      store.orders.map((o) => ({ ...o })),
    );
    const fresh = { ...store.orders[0]!, id: ID(400), shortCode: 'VT-NEW1' };
    await act(() => ctl.emit(fresh));
    expect(queryClient.getQueryData<Order[]>(queryKeys.orders)![0]?.id).toBe(ID(400));
  });

  it('invalidates the list when it was not cached', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const ctl = controllableRepository(store);
    const { queryClient } = await renderWithProviders(<ListProbe />, {
      store,
      repositories: { orders: ctl.repository },
    });
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    await act(() => ctl.emit({ ...store.orders[0]! }));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.orders });
  });

  it('follows the status and refetches when the stream comes back after a pause', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const ctl = controllableRepository(store);
    const { queryClient } = await renderWithProviders(<DetailProbe id={ID(302)} />, {
      store,
      repositories: { orders: ctl.repository },
    });
    expect(probe.latest).toBe('connecting');
    expect(ctl.subscribe.mock.calls[0]![0]).toEqual({ orderId: ID(302) });
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    await act(() => ctl.setStatus('live'));
    expect(probe.latest).toBe('live');
    expect(spy).not.toHaveBeenCalled();

    await act(() => ctl.setStatus('paused'));
    expect(probe.latest).toBe('paused');
    expect(spy).not.toHaveBeenCalled();

    await act(() => ctl.setStatus('live'));
    expect(probe.latest).toBe('live');
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.order(ID(302)) });
  });

  it('unsubscribes on unmount and does not subscribe for a guest', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const unsubscribe = jest.fn();
    const repository: OrdersRepository = {
      list: jest.fn(),
      getById: jest.fn(),
      subscribe: jest.fn(() => unsubscribe),
    };
    const { unmount } = await renderWithProviders(<ListProbe />, {
      store,
      repositories: { orders: repository },
    });
    await waitFor(() => expect(repository.subscribe).toHaveBeenCalledTimes(1));
    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    useSessionStore.setState({ isDemo: false });
    await renderWithProviders(<ListProbe />, { store, repositories: { orders: repository } });
    expect(repository.subscribe).toHaveBeenCalledTimes(1);
    expect(probe.latest).toBe('connecting');
  });
});
