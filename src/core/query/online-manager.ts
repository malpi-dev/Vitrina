import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/**
 * Wires TanStack Query's online/focus detection to React Native. Call at startup and again when
 * the mode changes. In demo mode all data is in memory, so queries must never pause "offline"
 * (the demo has to work in airplane mode).
 */
export function setupQueryManagers(isDemo = false): () => void {
  onlineManager.setEventListener((setOnline) => {
    if (isDemo) {
      setOnline(true);
      return () => undefined;
    }
    return NetInfo.addEventListener((state) => setOnline(state.isConnected !== false));
  });

  const onAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  };
  const subscription = AppState.addEventListener('change', onAppStateChange);
  return () => subscription.remove();
}
