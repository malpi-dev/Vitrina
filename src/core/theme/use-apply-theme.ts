import { useEffect } from 'react';
import { useColorScheme } from 'nativewind';

import { useThemeStore } from './theme.store';

/** Applies the stored preference to NativeWind and returns the effective scheme. */
export function useApplyTheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(preference);
  }, [preference, setColorScheme]);

  return colorScheme === 'dark' ? 'dark' : 'light';
}
