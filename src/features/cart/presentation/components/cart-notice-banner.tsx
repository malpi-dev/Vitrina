import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '@/core/theme';
import { AppText } from '@/core/ui';
import { formatMoney } from '@/core/utils/money';

import type { CartNotice } from '../../domain/reconcile-cart';

export function noticeMessage(notice: CartNotice): string {
  switch (notice.type) {
    case 'priceChanged':
      return `Price updated: ${notice.name} is now ${formatMoney(notice.toCents)}`;
    case 'quantityAdjusted':
      return `Only ${notice.to} ${notice.name} available — quantity updated`;
    case 'removed':
      return notice.reason === 'outOfStock'
        ? `${notice.name} is out of stock and was removed`
        : `${notice.name} is no longer available and was removed`;
  }
}

interface CartNoticeBannerProps {
  notice: CartNotice;
  index: number;
  onDismiss: (index: number) => void;
}

export function CartNoticeBanner({ notice, index, onDismiss }: CartNoticeBannerProps) {
  const colors = useThemeColors();
  return (
    <View
      testID={`cart-notice-${index}`}
      className="mb-2 flex-row items-center gap-2 rounded-xl border border-border bg-surface-muted p-3"
    >
      <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
      <AppText variant="caption" className="flex-1">
        {noticeMessage(notice)}
      </AppText>
      <Pressable
        testID={`cart-notice-dismiss-${index}`}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notice"
        onPress={() => onDismiss(index)}
        hitSlop={8}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
