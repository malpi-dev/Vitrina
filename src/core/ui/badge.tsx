import { View } from 'react-native';

import { AppText } from './app-text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'info' | 'danger';

const CONTAINER: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted',
  primary: 'bg-primary/15',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  info: 'bg-info/15',
  danger: 'bg-danger/15',
};

const TEXT: Record<BadgeTone, string> = {
  neutral: 'text-text-muted',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  danger: 'text-danger',
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  testID?: string;
}

export function Badge({ label, tone = 'neutral', testID }: BadgeProps) {
  return (
    <View testID={testID} className={`self-start rounded-full px-2.5 py-1 ${CONTAINER[tone]}`}>
      <AppText variant="caption" className={`font-semibold ${TEXT[tone]}`}>
        {label}
      </AppText>
    </View>
  );
}
