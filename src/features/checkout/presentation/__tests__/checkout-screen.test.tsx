import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { DomainError } from '@/core/errors';
import { useSessionStore } from '@/core/session';
import { useAuthStore } from '@/features/auth/presentation/auth.store';
import { useCartStore } from '@/features/cart/presentation/cart.store';
import { MockStore } from '@/features/demo/data/mock-store';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import type { PaymentOutcome } from '../../domain/payment-outcome';
import type { PaymentPresenter } from '../payment/payment-presenter';
import CheckoutScreen from '../screens/checkout-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

const stores: MockStore[] = [];

function setup(outcome: PaymentOutcome = { status: 'succeeded' }) {
  const store = new MockStore({ latencyMs: [0, 0] });
  stores.push(store);
  const product = store.products.find((p) => p.stock >= 5 && p.priceCents < 2000)!;
  useCartStore.getState().add(product, 2);
  const present = jest.fn().mockResolvedValue(outcome);
  const paymentPresenter: PaymentPresenter = { present };
  return { store, product, present, paymentPresenter };
}

async function renderCheckout(ctx: ReturnType<typeof setup>) {
  const result = await renderWithProviders(<CheckoutScreen />, {
    store: ctx.store,
    paymentPresenter: ctx.paymentPresenter,
  });
  await waitFor(() => expect(screen.getByTestId('address-line1').props.value).not.toBe(''));
  return result;
}

describe('CheckoutScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ isDemo: true });
    useAuthStore.setState({ status: 'unknown', user: null });
    useCartStore.setState({ items: [] });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    stores.splice(0).forEach((s) => s.dispose());
  });

  it('prefills the default address, shows the summary and the total on the pay button', async () => {
    const ctx = setup();
    await renderWithProviders(<CheckoutScreen />, {
      store: ctx.store,
      paymentPresenter: ctx.paymentPresenter,
    });
    expect(screen.getByTestId('checkout-skeleton')).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByTestId('address-full-name').props.value).toBe('Demo Shopper'),
    );
    expect(screen.getByTestId('address-line1').props.value).toBe('1600 Market Street');
    expect(screen.getByTestId('demo-banner')).toBeOnTheScreen();
    expect(screen.getByText(`${ctx.product.name} × 2`)).toBeOnTheScreen();
    const total = screen.getByTestId('checkout-total').props.children as string;
    expect(screen.getByTestId('pay-button')).toHaveAccessibleName(`Pay ${total}`);
  });

  it('pays: starts checkout with ids and quantities only, reports, clears the cart and opens the order', async () => {
    const ctx = setup();
    const startCheckout = jest.spyOn(ctx.store, 'createOrder');
    const { queryClient } = await renderCheckout(ctx);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await fireEvent.press(screen.getByTestId('pay-button'));

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    const input = startCheckout.mock.calls[0]![0];
    expect(input.items).toEqual([{ productId: ctx.product.id, quantity: 2 }]);
    expect(ctx.present).toHaveBeenCalledTimes(1);
    const orderId = ctx.present.mock.calls[0]![0].orderId as string;
    expect(routerMock.replace).toHaveBeenCalledWith(`/orders/${orderId}`);
    expect(useCartStore.getState().items).toEqual([]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['products'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['product'] });
    // The empty cart must not bounce us to /cart while navigating to the order.
    expect(routerMock.redirect).not.toHaveBeenCalled();
  });

  it('keeps the cart and shows a neutral banner when the payment is canceled', async () => {
    const ctx = setup({ status: 'canceled' });
    await renderCheckout(ctx);
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('payment-canceled-banner')).toBeOnTheScreen());
    expect(screen.getByText('Payment canceled — your cart is intact')).toBeOnTheScreen();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('shows the failure reason and "Try again" pays again', async () => {
    const ctx = setup({ status: 'failed', reason: 'Card declined (simulated)' });
    await renderCheckout(ctx);
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('payment-failed-banner')).toBeOnTheScreen());
    expect(screen.getByText('Card declined (simulated)')).toBeOnTheScreen();
    expect(useCartStore.getState().items).toHaveLength(1);

    ctx.present.mockResolvedValueOnce({ status: 'succeeded' });
    await fireEvent.press(screen.getByTestId('try-again-button'));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    expect(ctx.present).toHaveBeenCalledTimes(2);
  });

  it('lists the products that are out of stock and "Update cart" goes to the cart', async () => {
    const ctx = setup();
    await renderCheckout(ctx);
    ctx.store.failNext({ code: 'outOfStock', productIds: [ctx.product.id] });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('stock-error-banner')).toBeOnTheScreen());
    expect(screen.getByText(`• ${ctx.product.name}`)).toBeOnTheScreen();
    expect(ctx.present).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('update-cart-button'));
    expect(routerMock.navigate).toHaveBeenCalledWith('/cart');
  });

  it('shows a network error and Retry tries again', async () => {
    const ctx = setup();
    await renderCheckout(ctx);
    ctx.store.failNext({ code: 'network' });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('checkout-network-error')).toBeOnTheScreen());
    expect(screen.getByText("Couldn't reach the server")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('retry-button'));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
  });

  it('shows a generic message for validation errors', async () => {
    const ctx = setup();
    await renderCheckout(ctx);
    ctx.store.failNext({ code: 'validation' });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('checkout-validation-error')).toBeOnTheScreen());
    expect(screen.getByText('Please review your address and cart.')).toBeOnTheScreen();
  });

  it('does not show an error banner for unauthorized (handled globally)', async () => {
    const ctx = setup();
    await renderCheckout(ctx);
    ctx.store.failNext({ code: 'unauthorized' });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(screen.getByTestId('pay-button')).toBeEnabled());
    expect(screen.queryByTestId('checkout-unknown-error')).toBeNull();
    expect(screen.queryByTestId('stock-error-banner')).toBeNull();
  });

  it('asks for confirmation when the total changed and Cancel does not present the payment', async () => {
    const ctx = setup();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Cancel')?.onPress?.();
    });
    const item = useCartStore.getState().items[0]!;
    useCartStore.setState({
      items: [
        { ...item, snapshot: { ...item.snapshot, priceCents: item.snapshot.priceCents + 100 } },
      ],
    });
    await renderCheckout(ctx);
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(alert.mock.calls[0]![0]).toBe('Prices updated');
    expect(alert.mock.calls[0]![1]).toMatch(/^Your new total is \$\d+\.\d{2}\.$/);
    await waitFor(() => expect(screen.getByTestId('pay-button')).toBeEnabled());
    expect(ctx.present).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('continues to the payment when the new total is accepted', async () => {
    const ctx = setup();
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Continue')?.onPress?.();
    });
    const item = useCartStore.getState().items[0]!;
    useCartStore.setState({
      items: [
        { ...item, snapshot: { ...item.snapshot, priceCents: item.snapshot.priceCents + 100 } },
      ],
    });
    await renderCheckout(ctx);
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    expect(ctx.present).toHaveBeenCalledTimes(1);
  });

  it('still navigates when reporting the payment result fails', async () => {
    const ctx = setup();
    const reportPaymentResult = jest.fn().mockRejectedValue(new DomainError({ code: 'network' }));
    await renderWithProviders(<CheckoutScreen />, {
      store: ctx.store,
      paymentPresenter: ctx.paymentPresenter,
      repositories: {
        checkout: {
          startCheckout: (input) =>
            ctx.store.createOrder(input) && Promise.resolve({ orderId: 'o9', totalCents: 0 }),
          reportPaymentResult,
        },
      },
    });
    await waitFor(() => expect(screen.getByTestId('address-line1').props.value).not.toBe(''));
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Continue')?.onPress?.();
    });
    await fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/orders/o9'));
    expect(reportPaymentResult).toHaveBeenCalled();
  });

  it('sends guests to Sign in with the checkout as redirect', async () => {
    useSessionStore.setState({ isDemo: false });
    useAuthStore.setState({ status: 'signedOut', user: null });
    const ctx = setup();
    await renderWithProviders(<CheckoutScreen />, { paymentPresenter: ctx.paymentPresenter });
    expect(routerMock.replace).toHaveBeenCalledWith({
      pathname: '/sign-in',
      params: { redirect: '/checkout' },
    });
    expect(screen.queryByTestId('pay-button')).toBeNull();
  });

  it('redirects to the cart when it is empty', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    await renderWithProviders(<CheckoutScreen />, {
      store,
      paymentPresenter: { present: jest.fn() },
    });
    expect(routerMock.redirect).toHaveBeenCalledWith('/cart');
  });
});
