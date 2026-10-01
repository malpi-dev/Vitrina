import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useIsDemo } from '@/core/session';
import { AppText, Button, Card, Price, HEADER_EDGES, Screen } from '@/core/ui';

import { useSimulatedPaymentStore } from '../payment/simulated-payment.store';

const PAY_DELAY_MS = 1000;

/** "Simulated payment" sheet. Only reachable in demo mode; closing it any other way cancels. */
export default function SimulatedPaymentScreen() {
  const router = useRouter();
  const isDemo = useIsDemo();
  const pending = useSimulatedPaymentStore((s) => s.pending);
  const [paying, setPaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Captured on mount: settling clears `pending` while the sheet is still closing.
  const [totalCents] = useState(pending?.session.totalCents ?? 0);
  const available = isDemo && pending !== null;

  useEffect(() => {
    if (!available) router.back();
    // Only the very first render decides whether the sheet may stay open.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only guard
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      // Dismissed by gesture or back button: the payment is canceled (no-op if already settled).
      useSimulatedPaymentStore.getState().settle({ status: 'canceled' });
    },
    [],
  );

  const pay = () => {
    setPaying(true);
    timer.current = setTimeout(() => {
      // Close the sheet first so the checkout screen performs the follow-up navigation.
      router.back();
      useSimulatedPaymentStore.getState().settle({ status: 'succeeded' });
    }, PAY_DELAY_MS);
  };

  const fail = () => {
    router.back();
    useSimulatedPaymentStore
      .getState()
      .settle({ status: 'failed', reason: 'Card declined (simulated)' });
  };

  return (
    <Screen edges={HEADER_EDGES} testID="simulated-payment-screen" className="gap-5 pt-4">
      <View className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <AppText variant="label" testID="simulated-payment-notice">
          Demo mode — no real charge
        </AppText>
      </View>
      <View className="items-center gap-1 py-2">
        <AppText tone="muted">Total to pay</AppText>
        <Price cents={totalCents} size="lg" testID="simulated-payment-total" />
      </View>
      <Card>
        <View className="flex-row items-center justify-between">
          <AppText variant="label">Visa</AppText>
          <AppText tone="muted">•••• 4242</AppText>
        </View>
      </Card>
      <View className="gap-3">
        <Button
          title="Pay (simulated)"
          testID="simulated-pay-button"
          loading={paying}
          disabled={!available}
          onPress={pay}
        />
        <Button
          title="Simulate failure"
          variant="secondary"
          testID="simulated-fail-button"
          disabled={paying || !available}
          onPress={fail}
        />
      </View>
    </Screen>
  );
}
