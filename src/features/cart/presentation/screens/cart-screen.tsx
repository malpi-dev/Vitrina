import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, EmptyState, Screen } from '@/core/ui';
import { formatMoney } from '@/core/utils/money';

import { DEFAULT_SHIPPING_POLICY } from '../../domain/shipping-policy';
import { CartLine } from '../components/cart-line';
import { CartNoticeBanner } from '../components/cart-notice-banner';
import { useCartStore, useCartTotals } from '../cart.store';
import { useReconciledCart } from '../hooks/use-reconciled-cart';

function SummaryRow({
  label,
  value,
  testID,
  strong = false,
}: {
  label: string;
  value: string;
  testID: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <AppText variant={strong ? 'subtitle' : 'body'} tone={strong ? 'default' : 'muted'}>
        {label}
      </AppText>
      <AppText
        testID={testID}
        variant={strong ? 'subtitle' : 'body'}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </AppText>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { items, notices, status, dismissNotice } = useReconciledCart();
  const totals = useCartTotals();
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  if (items.length === 0 && notices.length === 0) {
    return (
      <Screen testID="cart-screen">
        <EmptyState
          testID="cart-empty"
          icon="bag-outline"
          title="Your cart is empty"
          message="Add something you like and it will show up here."
          actionLabel="Browse products"
          actionTestID="browse-products-button"
          onAction={() => router.navigate('/')}
        />
      </Screen>
    );
  }

  const missingForFree = DEFAULT_SHIPPING_POLICY.freeFromCents - totals.subtotalCents;
  const checking = status === 'checking';

  const header = (
    <View>
      {notices.map((notice, index) => (
        <CartNoticeBanner
          key={`${notice.type}-${notice.productId}-${index}`}
          notice={notice}
          index={index}
          onDismiss={dismissNotice}
        />
      ))}
      {status === 'offline' ? (
        <AppText variant="caption" tone="warning" testID="cart-offline-notice" className="mb-2">
          Prices will be confirmed at checkout
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen testID="cart-screen">
      <AppText variant="title" className="py-3">
        Cart
      </AppText>
      <FlashList
        testID="cart-list"
        data={items}
        keyExtractor={(item) => item.productId}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <CartLine
            item={item}
            onOpen={(id) => router.push({ pathname: '/product/[id]', params: { id } })}
            onQuantityChange={setQuantity}
            onRemove={remove}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bag-outline"
            title="Your cart is empty"
            actionLabel="Browse products"
            actionTestID="browse-products-button"
            onAction={() => router.navigate('/')}
          />
        }
      />
      <View
        testID="cart-summary"
        className={`gap-2 border-t border-border py-4 ${checking ? 'opacity-60' : ''}`}
      >
        <SummaryRow
          label="Subtotal"
          value={formatMoney(totals.subtotalCents)}
          testID="cart-subtotal"
        />
        <SummaryRow
          label="Shipping"
          value={totals.shippingCents === 0 ? 'Free' : formatMoney(totals.shippingCents)}
          testID="cart-shipping"
        />
        {totals.shippingCents > 0 && missingForFree > 0 ? (
          <AppText variant="caption" tone="muted" testID="cart-free-shipping-hint">
            Add {formatMoney(missingForFree)} more for free shipping
          </AppText>
        ) : null}
        <SummaryRow
          label="Total"
          value={formatMoney(totals.totalCents)}
          testID="cart-total"
          strong
        />
        <Button
          title={checking ? 'Checking prices…' : 'Checkout'}
          testID="checkout-button"
          disabled={checking || items.length === 0}
          onPress={() => router.push('/checkout')}
          className="mt-2"
        />
      </View>
    </Screen>
  );
}
