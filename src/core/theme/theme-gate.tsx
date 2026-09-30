import { useEffect, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { colors } from './tokens';
import { useApplyTheme } from './use-apply-theme';

/** Applies the persisted theme preference; matches the status bar and native background to it. */
export function ThemeGate({ children }: { children: ReactNode }) {
  const scheme = useApplyTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors[scheme].background);
  }, [scheme]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
}
