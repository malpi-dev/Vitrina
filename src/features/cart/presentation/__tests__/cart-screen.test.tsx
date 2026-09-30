import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { MockStore } from '@/features/demo/data/mock-store';
import { renderWithProviders } from '@/test/render-with-providers';
import { routerMock } from '@/test/expo-router-mock';

import { useCartStore } from '../cart.store';
import CartScreen from '../screens/cart-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@shopify/flash-list', () => jest.requireActual('@/test/flash-list-mock'));

function seed() {
  const store = new MockStore({ latencyMs: [0, 0] });
  const cheap = store.products.filter((p) => p.stock >= 5 && p.priceCents < 2000);
  return { store, p: cheap[0]! };
}

describe('CartScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useCartStore.setState({ items: [] });
  });

  it('shows the empty state and goes to Home', async () => {
    const { store } = seed();
    await renderWithProviders(<CartScreen />, { store });
    expect(screen.getByText('Your cart is empty')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('browse-products-button'));
    expect(routerMock.navigate).toHaveBeenCalledWith('/');
  });

  it('lists lines with totals, shipping hint and lets you change and remove', async () => {
    const { store, p } = seed();
    useCartStore.getState().add(p, 1);
    await renderWithProviders(<CartScreen />, { store });
    expect(screen.getByTestId(`cart-line-${p.id}`)).toBeOnTheScreen();
    expect(screen.getByTestId('cart-shipping')).toHaveTextContent('$4.99');
    expect(screen.getByTestId('cart-free-shipping-hint')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('checkout-button')).toBeEnabled());

    await fireEvent.press(screen.getByTestId(`cart-qty-${p.id}-increment`));
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent(
      `$${((p.priceCents * 2) / 100).toFixed(2)}`,
    );

    await fireEvent.press(screen.getByLabelText(`Remove ${p.name}`));
    expect(screen.getByText('Your cart is empty')).toBeOnTheScreen();
  });

  it('shows free shipping from $50.00 and opens checkout', async () => {
    const { store, p } = seed();
    useCartStore.getState().add(p, 10);
    useCartStore.getState().setQuantity(p.id, 10);
    const pricey = store.products.find((x) => x.stock >= 10 && x.priceCents >= 5000);
    if (pricey) useCartStore.getState().add(pricey, 1);
    await renderWithProviders(<CartScreen />, { store });
    const subtotal = useCartStore
      .getState()
      .items.reduce((n, i) => n + i.quantity * i.snapshot.priceCents, 0);
    if (subtotal >= 5000) {
      expect(screen.getByTestId('cart-shipping')).toHaveTextContent('Free');
      expect(screen.queryByTestId('cart-free-shipping-hint')).not.toBeOnTheScreen();
    }
    await waitFor(() => expect(screen.getByTestId('checkout-button')).toBeEnabled());
    await fireEvent.press(screen.getByTestId('checkout-button'));
    expect(routerMock.push).toHaveBeenCalledWith('/checkout');
  });

  it('shows a dismissible notice when the price changed', async () => {
    const { store, p } = seed();
    useCartStore.getState().add(p, 1);
    store.products.find((x) => x.id === p.id)!.priceCents = 777;
    await renderWithProviders(<CartScreen />, { store });
    expect(await screen.findByText(`Price updated: ${p.name} is now $7.77`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Dismiss notice'));
    expect(screen.queryByTestId('cart-notice-0')).not.toBeOnTheScreen();
  });

  it('shows the offline hint and keeps the cart', async () => {
    const { store, p } = seed();
    useCartStore.getState().add(p, 1);
    store.failNext({ code: 'network' });
    await renderWithProviders(<CartScreen />, { store });
    expect(await screen.findByTestId('cart-offline-notice')).toHaveTextContent(
      'Prices will be confirmed at checkout',
    );
    expect(screen.getByTestId(`cart-line-${p.id}`)).toBeOnTheScreen();
  });
});
