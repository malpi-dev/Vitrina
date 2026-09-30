import { TextInput, View, type TextInputProps } from 'react-native';

import { useThemeColors } from '@/core/theme';

import { AppText } from './app-text';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string | undefined;
}

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  const colors = useThemeColors();
  return (
    <View className="gap-1.5">
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        className={`min-h-12 rounded-xl border bg-surface px-4 font-sans text-base text-text ${error ? 'border-danger' : 'border-border'}`}
        {...inputProps}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
