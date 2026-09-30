import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useThemeColors } from '@/core/theme';
import { AppText } from '@/core/ui';

import { buildOrderTimeline, type TimelineStepKey } from '../../domain/build-order-timeline';
import type { Order } from '../../domain/order';
import { formatOrderDateTime } from '../format-order-date';

const LABELS: Record<TimelineStepKey, string> = {
  placed: 'Order placed',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const STATE_TEXT = { done: 'completed', current: 'current', upcoming: 'upcoming' } as const;

interface OrderTimelineProps {
  order: Pick<
    Order,
    'status' | 'createdAt' | 'paidAt' | 'shippedAt' | 'deliveredAt' | 'canceledAt'
  >;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const colors = useThemeColors();
  const { steps, canceledAt } = buildOrderTimeline(order);

  return (
    <View testID="order-timeline" className="gap-3">
      {steps.map((step) => {
        const when = step.at ? formatOrderDateTime(step.at) : null;
        const label = LABELS[step.key];
        return (
          <View
            key={step.key}
            testID={`timeline-step-${step.key}`}
            accessible
            accessibilityLabel={[label, STATE_TEXT[step.state], when].filter(Boolean).join(', ')}
            accessibilityState={{
              selected: step.state === 'current',
              checked: step.state === 'done',
            }}
            className={`flex-row items-center gap-3 ${step.state === 'upcoming' ? 'opacity-50' : ''}`}
          >
            <Ionicons
              name={
                step.state === 'done'
                  ? 'checkmark-circle'
                  : step.state === 'current'
                    ? 'radio-button-on'
                    : 'ellipse-outline'
              }
              size={24}
              color={
                step.state === 'upcoming'
                  ? colors.textMuted
                  : step.state === 'done'
                    ? colors.success
                    : colors.primary
              }
            />
            <View className="flex-1">
              <AppText
                variant={step.state === 'current' ? 'subtitle' : 'body'}
                tone={step.state === 'current' ? 'primary' : 'default'}
              >
                {label}
              </AppText>
              {when ? (
                <AppText variant="caption" tone="muted">
                  {when}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
      {canceledAt ? (
        <View
          testID="timeline-canceled"
          accessible
          accessibilityLabel={`Canceled, ${formatOrderDateTime(canceledAt)}`}
          className="flex-row items-center gap-3"
        >
          <Ionicons name="close-circle" size={24} color={colors.danger} />
          <AppText tone="danger" className="font-semibold">
            Canceled · {formatOrderDateTime(canceledAt)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
