import { ZodError } from 'zod';

import { DomainError, type DomainErrorInfo } from '@/core/errors';
import type { Profile } from '@/features/account/domain/profile';
import { calculateCartTotals } from '@/features/cart/domain/calculate-cart-totals';
import type { Category } from '@/features/catalog/domain/category';
import type { Product } from '@/features/catalog/domain/product';
import { validateCheckoutItems } from '@/features/checkout/domain/checkout-items';
import type { StartCheckoutInput } from '@/features/checkout/domain/checkout.repository';
import { shippingAddressSchema } from '@/features/checkout/domain/shipping-address';
import type { Order, OrderItem } from '@/features/orders/domain/order';
import { canTransition, type OrderStatus } from '@/features/orders/domain/order-status';

import { clone } from './clone';
import {
  DEMO_PROFILE,
  DEMO_USER,
  buildDemoProducts,
  buildSampleOrders,
  demoCategories,
} from './fixtures';

export interface MockStoreOptions {
  /** Random latency range per repository call. Default [300, 600]; tests use [0, 0]. */
  latencyMs?: [number, number];
  now?: () => Date;
  /** Time since `startLifecycle` at which each status is reached. */
  lifecycleDelaysMs?: { paid: number; shipped: number; delivered: number };
}

const DEFAULT_LIFECYCLE = { paid: 2000, shipped: 8000, delivered: 15000 };
// Same alphabet as vitrina.generate_short_code() (no ambiguous characters).
const SHORT_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

type OrderListener = (order: Order) => void;

/**
 * In-memory database of ONE demo session. Only the mock repositories use it. It applies the same
 * rules as the `create_order` RPC and the order state-machine trigger, in TypeScript.
 */
export class MockStore {
  readonly user = DEMO_USER;
  profile: Profile;
  categories: Category[];
  products: Product[];
  orders: Order[];

  private readonly latencyMs: [number, number];
  private readonly now: () => Date;
  private readonly lifecycleDelaysMs: { paid: number; shipped: number; delivered: number };
  private readonly listeners = new Set<OrderListener>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private pendingFailure: DomainErrorInfo | null = null;

  constructor(options: MockStoreOptions = {}) {
    this.latencyMs = options.latencyMs ?? [300, 600];
    this.now = options.now ?? (() => new Date());
    this.lifecycleDelaysMs = options.lifecycleDelaysMs ?? DEFAULT_LIFECYCLE;
    this.profile = clone(DEMO_PROFILE);
    this.categories = clone(demoCategories);
    this.products = buildDemoProducts();
    this.orders = buildSampleOrders(this.now());
  }

  /** Simulated network latency. No timer at all when the range is [0, 0]. */
  delay(): Promise<void> {
    const [min, max] = this.latencyMs;
    if (max <= 0) return Promise.resolve();
    const ms = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** The next repository call throws this error (tests and demos of error states). */
  failNext(info: DomainErrorInfo): void {
    this.pendingFailure = info;
  }

  takeFailure(): void {
    if (!this.pendingFailure) return;
    const info = this.pendingFailure;
    this.pendingFailure = null;
    throw new DomainError(info);
  }

  onOrderChange(listener: OrderListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(order: Order): void {
    for (const listener of [...this.listeners]) listener(clone(order));
  }

  private findOrder(orderId: string): Order {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) throw new DomainError({ code: 'notFound', entity: 'order' });
    return order;
  }

  private generateShortCode(): string {
    for (;;) {
      let code = 'VT-';
      for (let i = 0; i < 4; i++) {
        code += SHORT_CODE_ALPHABET[Math.floor(Math.random() * SHORT_CODE_ALPHABET.length)];
      }
      if (!this.orders.some((o) => o.shortCode === code)) return code;
    }
  }

  private restoreStock(order: Order): void {
    for (const item of order.items) {
      const product = this.products.find((p) => p.id === item.productId);
      if (product) product.stock += item.quantity;
    }
  }

  createOrder(input: StartCheckoutInput): Order {
    validateCheckoutItems(input.items);
    const parsed = shippingAddressSchema.safeParse(input.shippingAddress);
    if (!parsed.success) throw validationError(parsed.error);
    const shippingAddress = parsed.data;

    // The caller's previous unpaid order is canceled and its stock goes back (RPC rule 5).
    for (const pending of this.orders.filter((o) => o.status === 'pending_payment')) {
      this.setStatus(pending.id, 'canceled');
    }

    const requested = input.items.map((item) => ({
      item,
      product: this.products.find((p) => p.id === item.productId),
    }));

    const unavailable = requested.filter((r) => !r.product || !r.product.isActive);
    if (unavailable.length > 0) {
      throw new DomainError({
        code: 'productUnavailable',
        productIds: unavailable.map((r) => r.item.productId),
      });
    }

    const short = requested.filter((r) => r.product!.stock < r.item.quantity);
    if (short.length > 0) {
      throw new DomainError({
        code: 'outOfStock',
        productIds: short.map((r) => r.item.productId),
      });
    }

    const items: OrderItem[] = requested.map(({ item, product }) => {
      product!.stock -= item.quantity;
      return {
        productId: product!.id,
        productName: product!.name,
        unitPriceCents: product!.priceCents,
        quantity: item.quantity,
        lineTotalCents: product!.priceCents * item.quantity,
      };
    });
    const totals = calculateCartTotals(
      items.map((i) => ({ priceCents: i.unitPriceCents, quantity: i.quantity })),
    );

    const order: Order = {
      id: randomUuid(),
      shortCode: this.generateShortCode(),
      userId: this.user.id,
      status: 'pending_payment',
      items,
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      totalCents: totals.totalCents,
      currency: 'USD',
      shippingAddress,
      lastPaymentError: null,
      createdAt: this.now(),
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
      canceledAt: null,
    };
    this.orders.push(order);
    this.notify(order);
    return clone(order);
  }

  /** Mirrors the trigger: validates the transition and stamps the matching timestamp. */
  setStatus(orderId: string, status: OrderStatus): Order {
    const order = this.findOrder(orderId);
    if (order.status !== status) {
      if (!canTransition(order.status, status)) {
        throw new DomainError(
          { code: 'conflict' },
          `Invalid order status transition: ${order.status} -> ${status}`,
        );
      }
      const at = this.now();
      if (status === 'canceled') this.restoreStock(order);
      if (status === 'paid') order.paidAt = at;
      if (status === 'shipped') order.shippedAt = at;
      if (status === 'delivered') order.deliveredAt = at;
      if (status === 'canceled') order.canceledAt = at;
      order.status = status;
    }
    this.notify(order);
    return clone(order);
  }

  /** paid -> shipped -> delivered after the configured delays. Each step only runs if still valid. */
  startLifecycle(orderId: string): void {
    const steps: [OrderStatus, OrderStatus, number][] = [
      ['pending_payment', 'paid', this.lifecycleDelaysMs.paid],
      ['paid', 'shipped', this.lifecycleDelaysMs.shipped],
      ['shipped', 'delivered', this.lifecycleDelaysMs.delivered],
    ];
    for (const [from, to, delayMs] of steps) {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        const order = this.orders.find((o) => o.id === orderId);
        if (order?.status === from) this.setStatus(orderId, to);
      }, delayMs);
      this.timers.add(timer);
    }
  }

  recordPaymentFailure(orderId: string, reason: string): void {
    const order = this.findOrder(orderId);
    order.lastPaymentError = reason.slice(0, 500);
    this.notify(order);
  }

  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.listeners.clear();
  }
}

function validationError(error: ZodError): DomainError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'shippingAddress');
    fields[key] ??= issue.message;
  }
  return new DomainError({ code: 'validation', fields }, 'Check the highlighted fields');
}

function randomUuid(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}
