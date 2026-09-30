import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/core/theme';

import { AppText } from './app-text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  testID,
  className = '',
}: ButtonProps) {
  const colors = useThemeColors();
  const inactive = disabled || loading;
  const solid = variant === 'primary' || variant === 'danger';
  const foreground = solid ? colors.onPrimary : variant === 'ghost' ? colors.primary : colors.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={`min-h-12 min-w-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-80 ${CONTAINER[variant]} ${inactive ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <AppText
            variant="label"
            tone={variant === 'ghost' ? 'primary' : 'default'}
            className={solid ? 'text-on-primary' : ''}
          >
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
