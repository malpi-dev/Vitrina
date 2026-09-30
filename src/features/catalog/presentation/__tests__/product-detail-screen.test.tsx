import { fireEvent, screen } from '@testing-library/react-native';

import { useCartStore } from '@/features/cart/presentation/cart.store';
import { useToastStore } from '@/core/ui';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import ProductDetailScreen from '../screens/product-detail-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

const id = (n: number) => `00000000-0000-4000-8000-000000000${n}`;

describe('ProductDetailScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useCartStore.setState({ items: [] });
    useToastStore.getState().hide();
  });

  it('shows skeleton, then the product with gallery, price, category and an enabled add button', async () => {
    routerMock.setSearchParams({ id: id(207) });
    await renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByTestId('product-skeleton')).toBeOnTheScreen();
    expect(await screen.findByTestId('product-name')).toHaveTextContent('Ivory Stoneware Mug');
    expect(screen.getByTestId('product-gallery')).toBeOnTheScreen();
    expect(screen.getByTestId('gallery-dot-2')).toBeOnTheScreen();
    expect(screen.getByTestId('product-price')).toHaveTextContent('$22.00');
    expect(await screen.findByTestId('product-category')).toHaveTextContent('Kitchen');
    expect(screen.getByTestId('product-stock')).toHaveTextContent('In stock');
    expect(screen.getByTestId('add-to-cart-button')).toBeEnabled();
  });

  it('limits the quantity to the stock (3) and never below 1', async () => {
    routerMock.setSearchParams({ id: id(208) }); // Terracotta Stoneware Mug, stock 3
    await renderWithProviders(<ProductDetailScreen />);
    await screen.findByTestId('quantity-stepper');
    expect(screen.getByTestId('product-stock')).toHaveTextContent('Only 3 left');
    const up = screen.getByTestId('quantity-stepper-increment');
    await fireEvent.press(up);
    await fireEvent.press(up);
    expect(screen.getByTestId('quantity-stepper-value')).toHaveTextContent('3');
    expect(up).toBeDisabled();
    expect(screen.getByTestId('quantity-stepper-decrement')).toBeEnabled();
  });

  it('caps the quantity at 10 when there is plenty of stock', async () => {
    routerMock.setSearchParams({ id: id(207) }); // stock 25
    await renderWithProviders(<ProductDetailScreen />);
    const up = await screen.findByTestId('quantity-stepper-increment');
    for (let i = 0; i < 12; i++) await fireEvent.press(up);
    expect(screen.getByTestId('quantity-stepper-value')).toHaveTextContent('10');
  });

  it('shows "Out of stock" and a disabled button without stock', async () => {
    routerMock.setSearchParams({ id: id(206) }); // Chai Spice Mix, stock 0
    await renderWithProviders(<ProductDetailScreen />);
    expect(await screen.findByTestId('product-stock')).toHaveTextContent('Out of stock');
    expect(screen.getByTestId('add-to-cart-button')).toBeDisabled();
    expect(screen.queryByTestId('quantity-stepper')).not.toBeOnTheScreen();
  });

  it('shows "Product not available" for an unknown id and goes back to the catalog', async () => {
    routerMock.setSearchParams({ id: id(999) });
    await renderWithProviders(<ProductDetailScreen />);
    expect(await screen.findByTestId('product-not-available')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('back-to-catalog-button'));
    expect(routerMock.replace).toHaveBeenCalledWith('/');
  });

  it('adds to the cart with a toast and resets the stepper to 1', async () => {
    routerMock.setSearchParams({ id: id(207) });
    await renderWithProviders(<ProductDetailScreen />);
    await fireEvent.press(await screen.findByTestId('quantity-stepper-increment'));
    await fireEvent.press(screen.getByTestId('add-to-cart-button'));
    expect(useCartStore.getState().items).toMatchObject([{ productId: id(207), quantity: 2 }]);
    expect(useToastStore.getState()).toMatchObject({ message: 'Added to cart', tone: 'success' });
    expect(screen.getByTestId('quantity-stepper-value')).toHaveTextContent('1');
  });

  it('discounts what is already in the cart and ends with "Max in cart"', async () => {
    routerMock.setSearchParams({ id: id(208) }); // stock 3
    await renderWithProviders(<ProductDetailScreen />);
    await fireEvent.press(await screen.findByTestId('quantity-stepper-increment'));
    await fireEvent.press(screen.getByTestId('quantity-stepper-increment'));
    await fireEvent.press(screen.getByTestId('add-to-cart-button'));
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
    expect(screen.getByTestId('add-to-cart-button')).toBeDisabled();
    expect(screen.getByText('Max in cart')).toBeOnTheScreen();
  });

  it('warns when the cart is full', async () => {
    routerMock.setSearchParams({ id: id(207) });
    const { store } = await renderWithProviders(<ProductDetailScreen />);
    const others = store.products.filter((p) => p.id !== id(207) && p.stock > 0).slice(0, 20);
    for (const p of others) useCartStore.getState().add(p, 1);
    await screen.findByTestId('product-name');
    await fireEvent.press(screen.getByTestId('add-to-cart-button'));
    expect(useToastStore.getState()).toMatchObject({
      message: 'Your cart is full (20 items max)',
      tone: 'warning',
    });
  });
});
