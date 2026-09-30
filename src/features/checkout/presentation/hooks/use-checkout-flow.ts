import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRepositories } from '@/core/di';
import { toDomainError, type DomainError } from '@/core/errors';
import { queryKeys } from '@/core/query';
import { calculateCartTotals } from '@/features/cart/domain/calculate-cart-totals';
import { clearCart, useCartStore } from '@/features/cart/presentation/cart.store';
import { formatMoney } from '@/core/utils/money';

import { toCheckoutItems } from '../../domain/checkout-items';
import type { ShippingAddress } from '../../domain/shipping-address';
import { usePaymentPresenter } from '../payment/payment-presenter';

export type CheckoutFlowState =
  | { kind: 'idle' }
  | { kind: 'paying' }
  | { kind: 'succeeded' }
  | { kind: 'canceled' }
  | { kind: 'failed'; reason: string }
  | { kind: 'error'; error: DomainError };

/** Resolves true when the shopper accepts the new total. */
function confirmNewTotal(totalCents: number): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Prices updated',
      `Your new total is ${formatMoney(totalCents)}.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** startCheckout -> (confirm total) -> present payment -> report result -> navigate. */
export function useCheckoutFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { checkout } = useRepositories();
  const presenter = usePaymentPresenter();
  const [state, setState] = useState<CheckoutFlowState>({ kind: 'idle' });
  // A ref, not state: two quick taps must not start two checkouts.
  const busy = useRef(false);
  const lastAddress = useRef<ShippingAddress | null>(null);

  const pay = async (address: ShippingAddress) => {
    if (busy.current) return;
    busy.current = true;
    lastAddress.current = address;
    setState({ kind: 'paying' });
    try {
      const items = useCartStore.getState().items;
      const localTotals = calculateCartTotals(
        items.map((i) => ({ priceCents: i.snapshot.priceCents, quantity: i.quantity })),
      );

      const session = await checkout.startCheckout({
        items: toCheckoutItems(items),
        shippingAddress: address,
      });

      // The order reserved stock: refresh catalog data so stock badges are not stale.
      for (const key of ['products', 'product', 'products-by-ids']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }

      // The pending order stays behind: it is reused or expires on the server (definition §7.3).
      if (session.totalCents !== localTotals.totalCents) {
        const accepted = await confirmNewTotal(session.totalCents);
        if (!accepted) {
          setState({ kind: 'idle' });
          return;
        }
      }

      const outcome = await presenter.present(session);
      try {
        await checkout.reportPaymentResult(session.orderId, outcome);
      } catch {
        // Best effort: the order state comes from the backend (webhook or mock lifecycle).
      }

      if (outcome.status === 'succeeded') {
        // Flag first, so the empty-cart redirect does not race the navigation below.
        setState({ kind: 'succeeded' });
        clearCart();
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
        router.replace(`/orders/${session.orderId}`);
      } else if (outcome.status === 'canceled') {
        setState({ kind: 'canceled' });
      } else {
        setState({ kind: 'failed', reason: outcome.reason });
      }
    } catch (e) {
      setState({ kind: 'error', error: toDomainError(e) });
    } finally {
      busy.current = false;
    }
  };

  const retry = () => {
    if (lastAddress.current) void pay(lastAddress.current);
  };

  return { state, pay, retry };
}
