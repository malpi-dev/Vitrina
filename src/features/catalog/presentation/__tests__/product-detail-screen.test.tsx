import { fireEvent, screen } from '@testing-library/react-native';

import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import ProductDetailScreen from '../screens/product-detail-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

const id = (n: number) => `00000000-0000-4000-8000-000000000${n}`;

describe('ProductDetailScreen', () => {
  beforeEach(() => routerMock.reset());

  it('shows skeleton, then the product with gallery, price, category and a disabled add button', async () => {
    routerMock.setSearchParams({ id: id(207) });
    await renderWithProviders(<ProductDetailScreen />);
    expect(screen.getByTestId('product-skeleton')).toBeOnTheScreen();
    expect(await screen.findByTestId('product-name')).toHaveTextContent('Ivory Stoneware Mug');
    expect(screen.getByTestId('product-gallery')).toBeOnTheScreen();
    expect(screen.getByTestId('gallery-dot-2')).toBeOnTheScreen();
    expect(screen.getByTestId('product-price')).toHaveTextContent('$22.00');
    expect(await screen.findByTestId('product-category')).toHaveTextContent('Kitchen');
    expect(screen.getByTestId('product-stock')).toHaveTextContent('In stock');
    expect(screen.getByTestId('add-to-cart-button')).toBeDisabled();
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
});
