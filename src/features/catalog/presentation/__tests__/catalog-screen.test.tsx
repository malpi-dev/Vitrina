import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { MockProductsRepository } from '@/features/catalog/data/mock-products.repository';
import { MockStore } from '@/features/demo/data/mock-store';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import CatalogScreen from '../screens/catalog-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

const KITCHEN_ID = '00000000-0000-4000-8000-000000000102';
const cards = () => screen.queryAllByTestId(/^product-card-/);

describe('CatalogScreen', () => {
  beforeEach(() => routerMock.reset());

  it('shows the skeleton while loading and then the first page of products', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const real = new MockProductsRepository(store);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const products = {
      list: async (query: Parameters<typeof real.list>[0]) => {
        await gate;
        return real.list(query);
      },
      getById: real.getById.bind(real),
      getByIds: real.getByIds.bind(real),
      listCategories: real.listCategories.bind(real),
    };
    await renderWithProviders(<CatalogScreen />, { store, repositories: { products } });
    expect(screen.getByTestId('catalog-skeleton')).toBeOnTheScreen();
    await act(async () => release());
    expect(await screen.findByTestId('product-grid')).toBeOnTheScreen();
    expect(screen.queryByTestId('catalog-skeleton')).not.toBeOnTheScreen();
    expect(cards()).toHaveLength(20);
    expect(screen.getByText('Vitrina')).toBeOnTheScreen();
    expect(screen.getByTestId('open-filters-button')).toBeOnTheScreen();
  });

  it('searching "mug" debounces into the route params and shows the 3 matching products', async () => {
    await renderWithProviders(<CatalogScreen />);
    await screen.findByTestId('product-grid');
    await fireEvent.changeText(screen.getByTestId('search-input'), 'Mug');
    expect(routerMock.setParams).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(routerMock.setParams).toHaveBeenCalledWith(expect.objectContaining({ q: 'Mug' })),
    );
    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(screen.getByText('Ivory Stoneware Mug')).toBeOnTheScreen();
    expect(screen.getByText('Insulated Travel Mug')).toBeOnTheScreen();
  });

  it('clearing the search box removes q from the params', async () => {
    routerMock.setSearchParams({ q: 'mug' });
    await renderWithProviders(<CatalogScreen />);
    await screen.findByTestId('product-grid');
    expect(screen.getByTestId('search-input').props.value).toBe('mug');
    await fireEvent.press(screen.getByTestId('search-clear'));
    await waitFor(() => expect(cards()).toHaveLength(20));
  });

  it('selecting a category chip writes it to the params', async () => {
    await renderWithProviders(<CatalogScreen />);
    await screen.findByTestId('category-chip-kitchen');
    await fireEvent.press(screen.getByTestId('category-chip-kitchen'));
    expect(routerMock.setParams).toHaveBeenCalledWith(
      expect.objectContaining({ category: KITCHEN_ID }),
    );
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    expect(cards().length).toBeLessThan(20);
  });

  it('shows the empty state and "Clear filters" restores the full list', async () => {
    routerMock.setSearchParams({ q: 'zzzz-no-match' });
    await renderWithProviders(<CatalogScreen />);
    expect(await screen.findByTestId('catalog-empty')).toBeOnTheScreen();
    expect(screen.getByText('No products match your filters')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('clear-filters-button'));
    await waitFor(() => expect(cards()).toHaveLength(20));
    expect(screen.queryByTestId('catalog-empty')).not.toBeOnTheScreen();
  });

  it('shows the error state and recovers on Retry', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const real = new MockProductsRepository(store);
    let fail = true;
    const products = {
      list: async (query: Parameters<typeof real.list>[0]) => {
        if (fail) {
          fail = false;
          throw new DomainError({ code: 'network' });
        }
        return real.list(query);
      },
      getById: real.getById.bind(real),
      getByIds: real.getByIds.bind(real),
      listCategories: real.listCategories.bind(real),
    };
    await renderWithProviders(<CatalogScreen />, { store, repositories: { products } });
    expect(await screen.findByTestId('catalog-error')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('retry-button'));
    expect(await screen.findByTestId('product-grid')).toBeOnTheScreen();
    expect(cards()).toHaveLength(20);
  });

  it('loads the next page when the end is reached', async () => {
    await renderWithProviders(<CatalogScreen />);
    const grid = await screen.findByTestId('product-grid');
    await act(async () => grid.props.onEndReached());
    await waitFor(() => expect(cards()).toHaveLength(30));
  });

  it('shows a retry row when a page fails and loads it on Retry', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const real = new MockProductsRepository(store);
    let failSecondPage = true;
    const products = {
      list: jest.fn(async (query: Parameters<typeof real.list>[0]) => {
        if (query.cursor && failSecondPage) {
          failSecondPage = false;
          throw new Error('boom');
        }
        return real.list(query);
      }),
      getById: real.getById.bind(real),
      getByIds: real.getByIds.bind(real),
      listCategories: real.listCategories.bind(real),
    };
    await renderWithProviders(<CatalogScreen />, { store, repositories: { products } });
    const grid = await screen.findByTestId('product-grid');
    await act(async () => grid.props.onEndReached());
    expect(await screen.findByTestId('load-more-retry')).toBeOnTheScreen();
    expect(cards()).toHaveLength(20);
    await fireEvent.press(screen.getByTestId('load-more-retry'));
    await waitFor(() => expect(cards()).toHaveLength(30));
    expect(screen.queryByTestId('load-more-retry')).not.toBeOnTheScreen();
  });

  it('opens the detail when a card is pressed', async () => {
    await renderWithProviders(<CatalogScreen />);
    const card = (await screen.findAllByTestId(/^product-card-/))[0]!;
    await fireEvent.press(card);
    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/product/[id]',
      params: { id: expect.any(String) },
    });
  });

  it('opens the filters modal with the current filters and counts the modal ones', async () => {
    routerMock.setSearchParams({ q: 'mug', min: '10', inStock: '1', sort: 'price_desc' });
    await renderWithProviders(<CatalogScreen />);
    await screen.findByTestId('product-grid');
    expect(within(screen.getByTestId('filters-count')).getByText('3')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('open-filters-button'));
    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/filters',
      params: { q: 'mug', min: '10', inStock: '1', sort: 'price_desc' },
    });
  });
});
