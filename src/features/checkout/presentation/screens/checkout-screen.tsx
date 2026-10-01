import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { View, type ScrollView } from 'react-native';

import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';
import { useRequireSession } from '@/features/auth/presentation/hooks/use-require-session';
import { useMyProfile } from '@/features/auth/presentation/hooks/use-my-profile';
import { useCartItems, useCartTotals } from '@/features/cart/presentation/cart.store';
import { DemoBanner } from '@/features/demo/presentation/components/demo-banner';
import { AppText, Button, Card, Price, HEADER_EDGES, Screen, Skeleton } from '@/core/ui';
import { formatMoney } from '@/core/utils/money';

import { AddressForm } from '../components/address-form';
import { useCheckoutFlow, type CheckoutFlowState } from '../hooks/use-checkout-flow';

type Productish = { productId: string; snapshot: { name: string } };

function Banner({
  testID,
  tone,
  children,
}: {
  testID: string;
  tone: 'neutral' | 'danger';
  children: ReactNode;
}) {
  return (
    <View
      testID={testID}
      className={`gap-2 rounded-xl border px-4 py-3 ${
        tone === 'danger' ? 'border-danger bg-surface' : 'border-border bg-surface-muted'
      }`}
    >
      {children}
    </View>
  );
}

function FlowBanner({
  state,
  items,
  onRetry,
  onUpdateCart,
}: {
  state: CheckoutFlowState;
  items: Productish[];
  onRetry: () => void;
  onUpdateCart: () => void;
}) {
  if (state.kind === 'canceled') {
    return (
      <Banner testID="payment-canceled-banner" tone="neutral">
        <AppText>Payment canceled — your cart is intact</AppText>
      </Banner>
    );
  }
  if (state.kind === 'failed') {
    return (
      <Banner testID="payment-failed-banner" tone="danger">
        <AppText tone="danger" variant="label">
          Payment failed
        </AppText>
        <AppText>{state.reason}</AppText>
        <Button title="Try again" variant="secondary" testID="try-again-button" onPress={onRetry} />
      </Banner>
    );
  }
  if (state.kind !== 'error') return null;

  const info = state.error.info;
  if (info.code === 'outOfStock' || info.code === 'productUnavailable') {
    const names = info.productIds
      .map((id) => items.find((i) => i.productId === id)?.snapshot.name)
      .filter((n): n is string => n !== undefined);
    return (
      <Banner testID="stock-error-banner" tone="danger">
        <AppText tone="danger" variant="label">
          {info.code === 'outOfStock' ? 'Not enough stock' : 'No longer available'}
        </AppText>
        {names.length > 0 ? (
          names.map((name) => <AppText key={name}>• {name}</AppText>)
        ) : (
          <AppText>Some items in your cart changed.</AppText>
        )}
        <Button
          title="Update cart"
          variant="secondary"
          testID="update-cart-button"
          onPress={onUpdateCart}
        />
      </Banner>
    );
  }
  if (info.code === 'network') {
    return (
      <Banner testID="checkout-network-error" tone="danger">
        <AppText tone="danger">Couldn&apos;t reach the server</AppText>
        <Button title="Retry" variant="secondary" testID="retry-button" onPress={onRetry} />
      </Banner>
    );
  }
  if (info.code === 'validation') {
    return (
      <Banner testID="checkout-validation-error" tone="danger">
        <AppText tone="danger">Please review your address and cart.</AppText>
      </Banner>
    );
  }
  // `unauthorized` is handled globally; anything else gets a generic message.
  if (info.code === 'unauthorized') return null;
  return (
    <Banner testID="checkout-unknown-error" tone="danger">
      <AppText tone="danger">Something went wrong. Please try again.</AppText>
      <Button title="Retry" variant="secondary" testID="retry-button" onPress={onRetry} />
    </Banner>
  );
}

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <AppText tone="muted">{label}</AppText>
      <AppText testID={testID} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
    </View>
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const canRender = useRequireSession('/checkout');
  const mode = useSessionMode();
  const items = useCartItems();
  const totals = useCartTotals();
  const profile = useMyProfile();
  const { state, pay, retry } = useCheckoutFlow();
  const scrollRef = useRef<ScrollView>(null);

  // The banners sit at the top while the Pay button is at the bottom: bring them into view.
  useEffect(() => {
    if (state.kind === 'canceled' || state.kind === 'failed' || state.kind === 'error') {
      // After the banner is laid out; an animated scroll gets cut short by the layout change.
      const frame = requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ y: 0, animated: false }),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [state]);

  if (!canRender)
    return (
      <Screen edges={HEADER_EDGES} testID="checkout-screen">
        {null}
      </Screen>
    );
  // After a successful payment the cart is emptied while we navigate to the order: do not bounce.
  if (items.length === 0 && state.kind !== 'succeeded') return <Redirect href="/cart" />;

  const paying = state.kind === 'paying' || state.kind === 'succeeded';

  const summary = (
    <Card testID="checkout-summary" className="gap-3">
      {items.map((item) => (
        <View key={item.productId} className="flex-row items-center justify-between gap-3">
          <AppText className="flex-1" numberOfLines={2}>
            {item.snapshot.name} × {item.quantity}
          </AppText>
          <Price cents={item.snapshot.priceCents * item.quantity} size="sm" />
        </View>
      ))}
      <View className="gap-2 border-t border-border pt-3">
        <Row
          label="Subtotal"
          value={formatMoney(totals.subtotalCents)}
          testID="checkout-subtotal"
        />
        <Row
          label="Shipping"
          value={totals.shippingCents === 0 ? 'Free' : formatMoney(totals.shippingCents)}
          testID="checkout-shipping"
        />
        <View className="flex-row items-center justify-between">
          <AppText variant="subtitle">Total</AppText>
          <Price cents={totals.totalCents} testID="checkout-total" />
        </View>
      </View>
    </Card>
  );

  return (
    <Screen
      scroll
      scrollRef={scrollRef}
      edges={HEADER_EDGES}
      testID="checkout-screen"
      className="gap-4 pt-2"
    >
      {mode === 'demo' ? <DemoBanner /> : null}
      <FlowBanner
        state={state}
        items={items}
        onRetry={retry}
        onUpdateCart={() => router.navigate('/cart')}
      />
      <AppText variant="subtitle">Shipping address</AppText>
      {profile.isPending ? (
        <View className="gap-4" testID="checkout-skeleton">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </View>
      ) : (
        <AddressForm
          initialValue={profile.data?.defaultAddress ?? undefined}
          defaultFullName={profile.data?.fullName ?? ''}
          submitLabel={`Pay ${formatMoney(totals.totalCents)}`}
          submitTestID="pay-button"
          loading={paying}
          footer={summary}
          onSubmit={(address) => void pay(address)}
        />
      )}
    </Screen>
  );
}
