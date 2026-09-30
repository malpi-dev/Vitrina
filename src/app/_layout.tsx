import '@/global.css';

import { useEffect, useMemo } from 'react';
import {
  DMSerifDisplay_400Regular,
  useFonts as useSerifFonts,
} from '@expo-google-fonts/dm-serif-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createLiveRepositories, createMockRepositories, RepositoryProvider } from '@/core/di';
import { queryClient, setupQueryManagers } from '@/core/query';
import { useIsDemo, useSessionHydrated, useSessionStore } from '@/core/session';
import { getSupabaseClient } from '@/core/supabase';
import { ThemeGate, useThemeColors } from '@/core/theme';
import { ToastHost } from '@/core/ui';
import { useAuthStore } from '@/features/auth/presentation/auth.store';
import { useAuthBootstrap } from '@/features/auth/presentation/hooks/use-auth-bootstrap';
import { useUnauthorizedHandler } from '@/features/auth/presentation/hooks/use-unauthorized-handler';
import { PaymentPresenterRoot } from '@/features/checkout/presentation/payment/payment-presenter';
import { MockStore } from '@/features/demo/data/mock-store';

void SplashScreen.preventAutoHideAsync();

/** The root stack. Detail and filters show a native header; everything else brings its own. */
function AppStack() {
  const colors = useThemeColors();
  const headerOptions = {
    headerShown: true,
    title: '',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
  } as const;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="product/[id]" options={headerOptions} />
      <Stack.Screen name="orders/[id]" options={{ ...headerOptions, title: 'Order' }} />
      <Stack.Screen
        name="account/address"
        options={{ ...headerOptions, title: 'Default address' }}
      />
      <Stack.Screen name="checkout/index" options={{ ...headerOptions, title: 'Checkout' }} />
      <Stack.Screen
        name="checkout/simulated-payment"
        options={{
          ...headerOptions,
          title: 'Simulated payment',
          presentation: 'modal',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="filters"
        options={{
          ...headerOptions,
          title: 'Filters',
          presentation: 'modal',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useSerifFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
  });
  const hydrated = useSessionHydrated();
  const authStatus = useAuthStore((s) => s.status);

  const isDemo = useIsDemo();
  // In demo there is no session to read; otherwise hold the splash until supabase-js answers.
  const ready =
    (fontsLoaded || fontError !== null) && hydrated && (isDemo || authStatus !== 'unknown');
  const demoSessionId = useSessionStore((s) => s.demoSessionId);
  // One MockStore per demo session; a new id (Explore demo again) means fresh data.
  const mockStore = useMemo(
    () => (isDemo ? new MockStore() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- demoSessionId is the reset trigger
    [isDemo, demoSessionId],
  );
  const repositories = useMemo(
    () =>
      mockStore ? createMockRepositories(mockStore) : createLiveRepositories(getSupabaseClient()),
    [mockStore],
  );
  useEffect(() => () => mockStore?.dispose(), [mockStore]);

  useAuthBootstrap(isDemo ? null : repositories.auth);
  useUnauthorizedHandler(repositories.auth);

  useEffect(() => setupQueryManagers(isDemo), [isDemo]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeGate>
            <RepositoryProvider repositories={repositories}>
              <PaymentPresenterRoot>
                <AppStack />
              </PaymentPresenterRoot>
            </RepositoryProvider>
            <ToastHost />
          </ThemeGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
