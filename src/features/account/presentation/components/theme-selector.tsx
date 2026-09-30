import { Pressable, View } from 'react-native';

import { useThemeStore, type ThemePreference } from '@/core/theme';
import { AppText } from '@/core/ui';

const OPTIONS: { value: ThemePreference; label: string; testID: string }[] = [
  { value: 'system', label: 'System', testID: 'theme-system' },
  { value: 'light', label: 'Light', testID: 'theme-light' },
  { value: 'dark', label: 'Dark', testID: 'theme-dark' },
];

/** Segmented control for the theme preference (persisted by the theme store). */
export function ThemeSelector() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <View
      accessibilityRole="radiogroup"
      className="flex-row rounded-xl border border-border bg-surface-muted p-1"
    >
      {OPTIONS.map(({ value, label, testID }) => {
        const selected = preference === value;
        return (
          <Pressable
            key={value}
            testID={testID}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => setPreference(value)}
            className={`min-h-11 flex-1 items-center justify-center rounded-lg ${selected ? 'bg-primary' : ''}`}
          >
            <AppText variant="label" tone={selected ? 'onPrimary' : 'default'}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
