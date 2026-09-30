import { useState } from 'react';
import { View } from 'react-native';

import { DomainError } from '@/core/errors';
import { useThemeStore, type ThemePreference } from '@/core/theme';

import {
  AppText,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Price,
  QuantityStepper,
  Screen,
  Skeleton,
  showToast,
  TextField,
  type BadgeTone,
} from '..';

const BADGE_TONES: BadgeTone[] = ['neutral', 'primary', 'success', 'warning', 'info', 'danger'];
const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

/** Temporary dev screen (removed in phase 05) that shows every base component. */
export default function KitchenSink() {
  const [qty, setQty] = useState(1);
  const { preference, setPreference } = useThemeStore();

  return (
    <Screen scroll className="gap-6 pt-4">
      <AppText variant="display">Kitchen sink</AppText>

      <View className="gap-2">
        <AppText variant="label" tone="muted">
          Theme
        </AppText>
        <View className="flex-row gap-2">
          {PREFERENCES.map((p) => (
            <Button
              key={p}
              title={p[0]!.toUpperCase() + p.slice(1)}
              variant={preference === p ? 'primary' : 'secondary'}
              onPress={() => setPreference(p)}
              testID={`theme-${p}`}
            />
          ))}
        </View>
      </View>

      <View className="gap-1">
        <AppText variant="display">Display</AppText>
        <AppText variant="title">Title</AppText>
        <AppText variant="subtitle">Subtitle</AppText>
        <AppText variant="body">Body text</AppText>
        <AppText variant="caption">Caption text</AppText>
        <AppText variant="label">Label text</AppText>
        <AppText tone="muted">Muted</AppText>
        <AppText tone="primary">Primary</AppText>
        <AppText tone="danger">Danger</AppText>
        <AppText tone="success">Success</AppText>
      </View>

      <View className="gap-1">
        <Price cents={499} size="sm" />
        <Price cents={5000} size="md" />
        <Price cents={120000} size="lg" />
        <Price cents={6500} strikethrough />
      </View>

      <View className="gap-2">
        <Button
          title="Primary"
          onPress={() => showToast('Primary pressed', 'success')}
          icon="cart"
        />
        <Button title="Secondary" variant="secondary" onPress={() => showToast('Secondary')} />
        <Button title="Ghost" variant="ghost" onPress={() => showToast('Ghost', 'warning')} />
        <Button title="Danger" variant="danger" onPress={() => showToast('Danger', 'danger')} />
        <Button title="Loading" loading onPress={() => undefined} />
        <Button title="Disabled" disabled onPress={() => undefined} />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {BADGE_TONES.map((tone) => (
          <Badge key={tone} label={tone} tone={tone} />
        ))}
      </View>

      <View className="gap-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-40" />
      </View>

      <View className="h-56 rounded-2xl border border-border bg-surface">
        <EmptyState
          icon="bag-outline"
          title="Your cart is empty"
          message="Browse products to get started."
          actionLabel="Browse products"
          onAction={() => showToast('Browse')}
        />
      </View>

      <View className="h-56 rounded-2xl border border-border bg-surface">
        <ErrorState
          error={new DomainError({ code: 'network' })}
          onRetry={() => showToast('Retry')}
        />
      </View>

      <TextField label="Email" placeholder="you@example.com" error="Enter a valid email" />

      <QuantityStepper value={qty} min={1} max={5} onChange={setQty} testID="kitchen-qty" />

      <Button title="Show toast" onPress={() => showToast('Hello from the toast', 'info')} />
    </Screen>
  );
}
