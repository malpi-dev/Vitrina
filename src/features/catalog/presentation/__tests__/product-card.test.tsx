import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Product } from '../../domain/product';
import { ProductCard } from '../components/product-card';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'ivory-mug',
  name: 'Ivory Stoneware Mug',
  description: '',
  priceCents: 2200,
  currency: 'USD',
  categoryId: 'c1',
  imageUrls: ['https://img.test/1.webp'],
  stock: 25,
  isActive: true,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides,
});

describe('ProductCard', () => {
  it('shows the name and the formatted price with no badge for plenty of stock', async () => {
    await render(<ProductCard product={product()} onPress={jest.fn()} />);
    expect(screen.getByText('Ivory Stoneware Mug')).toBeOnTheScreen();
    expect(screen.getByText('$22.00')).toBeOnTheScreen();
    expect(screen.queryByText('Out of stock')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Ivory Stoneware Mug, $22.00')).toBeOnTheScreen();
  });

  it('shows "Out of stock" when there is no stock', async () => {
    await render(<ProductCard product={product({ stock: 0 })} onPress={jest.fn()} />);
    expect(screen.getByText('Out of stock')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ivory Stoneware Mug, $22.00, out of stock')).toBeOnTheScreen();
  });

  it('shows "Only 2 left" for low stock', async () => {
    await render(<ProductCard product={product({ stock: 2 })} onPress={jest.fn()} />);
    expect(screen.getByText('Only 2 left')).toBeOnTheScreen();
  });

  it('does not warn at stock 4', async () => {
    await render(<ProductCard product={product({ stock: 4 })} onPress={jest.fn()} />);
    expect(screen.queryByText(/Only/)).not.toBeOnTheScreen();
  });

  it('reports presses with the product', async () => {
    const onPress = jest.fn();
    const p = product();
    await render(<ProductCard product={p} onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('product-card-p1'));
    expect(onPress).toHaveBeenCalledWith(p);
  });
});
