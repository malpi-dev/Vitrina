import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/core/theme';

import { AppText } from './app-text';
import { Button } from './button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
  testID?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionTestID,
  testID,
}: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View testID={testID} className="flex-1 items-center justify-center gap-2 p-8">
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <AppText variant="subtitle" className="text-center">
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" className="text-center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          className="mt-4"
          testID={actionTestID}
        />
      ) : null}
    </View>
  );
}
