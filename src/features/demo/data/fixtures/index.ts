import { Asset } from 'expo-asset';

import { calculateCartTotals } from '@/features/cart/domain/calculate-cart-totals';
import type { Profile } from '@/features/account/domain/profile';
import type { AuthUser } from '@/features/auth/domain/auth-user';
import type { Category } from '@/features/catalog/domain/category';
import type { Product } from '@/features/catalog/domain/product';
import type { Order, OrderItem } from '@/features/orders/domain/order';
import type { OrderStatus } from '@/features/orders/domain/order-status';

import catalog from './catalog.json';
import { productImageModules } from './product-images.generated';

interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  categoryId: string;
  imagePaths: string[];
  stock: number;
  isActive: boolean;
  createdAt: string;
}

export const demoCategories: Category[] = catalog.categories.map((c) => ({ ...c }));

/** Same ids, prices and stock as `supabase/seed.sql` (a test enforces the parity). */
export function buildDemoProducts(): Product[] {
  return (catalog.products as CatalogProduct[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    currency: 'USD',
    categoryId: p.categoryId,
    imageUrls: p.imagePaths.map((path) => {
      const module = productImageModules[path];
      if (module === undefined) {
        // A generation bug (run `npm run images:generate`), not a domain error.
        throw new Error(`Missing bundled image for ${path}`);
      }
      return Asset.fromModule(module).uri;
    }),
    stock: p.stock,
    isActive: p.isActive,
    createdAt: new Date(p.createdAt),
  }));
}

export const DEMO_USER: AuthUser = {
  id: '00000000-0000-4000-8000-000000000901',
  email: 'demo@vitrina.app',
};

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER.id,
  fullName: 'Demo Shopper',
  defaultAddress: {
    fullName: 'Demo Shopper',
    line1: '1600 Market Street',
    line2: 'Apt 4B',
    city: 'Philadelphia',
    state: 'PA',
    postalCode: '19103',
    country: 'US',
    phone: '+1 215 555 0142',
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function toItems(products: Product[], lines: { slug: string; quantity: number }[]): OrderItem[] {
  return lines.map(({ slug, quantity }) => {
    const product = products.find((p) => p.slug === slug);
    if (!product) throw new Error(`Unknown demo product ${slug}`);
    return {
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity,
      lineTotalCents: product.priceCents * quantity,
    };
  });
}

/** The 3 sample orders of the demo user (definition 12.2), relative to `now`. */
export function buildSampleOrders(now: Date): Order[] {
  const products = buildDemoProducts();
  const address = DEMO_PROFILE.defaultAddress!;
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

  const build = (
    id: string,
    shortCode: string,
    status: OrderStatus,
    createdAt: Date,
    lines: { slug: string; quantity: number }[],
    dates: Partial<Pick<Order, 'paidAt' | 'shippedAt' | 'deliveredAt' | 'canceledAt'>>,
  ): Order => {
    const items = toItems(products, lines);
    const totals = calculateCartTotals(
      items.map((i) => ({ priceCents: i.unitPriceCents, quantity: i.quantity })),
    );
    return {
      id,
      shortCode,
      userId: DEMO_USER.id,
      status,
      items,
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      totalCents: totals.totalCents,
      currency: 'USD',
      shippingAddress: { ...address },
      lastPaymentError: null,
      createdAt,
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
      canceledAt: null,
      ...dates,
    };
  };

  const deliveredAt = at(-12 * DAY_MS);
  const shippedCreated = at(-2 * DAY_MS);
  const canceledCreated = at(-5 * DAY_MS);

  return [
    build(
      '00000000-0000-4000-8000-000000000301',
      'VT-DM24',
      'delivered',
      deliveredAt,
      [
        { slug: 'ivory-stoneware-mug', quantity: 1 },
        { slug: 'ethiopia-yirgacheffe-beans', quantity: 1 },
      ],
      {
        paidAt: new Date(deliveredAt.getTime() + 5 * MINUTE_MS),
        shippedAt: new Date(deliveredAt.getTime() + DAY_MS),
        deliveredAt: new Date(deliveredAt.getTime() + 3 * DAY_MS),
      },
    ),
    build(
      '00000000-0000-4000-8000-000000000302',
      'VT-DM37',
      'shipped',
      shippedCreated,
      [{ slug: 'gooseneck-kettle', quantity: 1 }],
      {
        paidAt: new Date(shippedCreated.getTime() + 5 * MINUTE_MS),
        shippedAt: new Date(shippedCreated.getTime() + DAY_MS),
      },
    ),
    build(
      '00000000-0000-4000-8000-000000000303',
      'VT-DM59',
      'canceled',
      canceledCreated,
      [{ slug: 'linen-notebook-a5', quantity: 2 }],
      { canceledAt: new Date(canceledCreated.getTime() + 30 * MINUTE_MS) },
    ),
  ];
}
