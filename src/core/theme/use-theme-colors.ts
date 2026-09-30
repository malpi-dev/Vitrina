import { useColorScheme } from 'nativewind';

import { colors, type ThemeColors } from './tokens';

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colors[colorScheme === 'dark' ? 'dark' : 'light'];
}
