import { Text } from 'react-native';

import { formatMoney } from '@/core/utils/money';

export type PriceSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<PriceSize, string> = {
  sm: 'font-sans text-sm',
  md: 'font-semibold text-base',
  lg: 'font-serif text-3xl',
};

interface PriceProps {
  cents: number;
  size?: PriceSize;
  strikethrough?: boolean;
  className?: string;
  testID?: string;
}

export function Price({
  cents,
  size = 'md',
  strikethrough = false,
  className = '',
  testID,
}: PriceProps) {
  return (
    <Text
      testID={testID}
      className={`${SIZE_CLASS[size]} ${strikethrough ? 'text-text-muted line-through' : 'text-primary'} ${className}`}
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {formatMoney(cents)}
    </Text>
  );
}
