import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { isDemoForced } from '@/core/config/env';
import { useSessionStore } from '@/core/session';
import { useThemeColors } from '@/core/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; testID: string }[] = [
  { name: 'index', title: 'Home', icon: 'storefront-outline', testID: 'tab-home' },
  { name: 'cart', title: 'Cart', icon: 'bag-outline', testID: 'tab-cart' },
  { name: 'orders', title: 'Orders', icon: 'receipt-outline', testID: 'tab-orders' },
  { name: 'account', title: 'Account', icon: 'person-outline', testID: 'tab-account' },
];

export default function TabsLayout() {
  const colors = useThemeColors();
  const hasSeenWelcome = useSessionStore((s) => s.hasSeenWelcome);

  if (!hasSeenWelcome && !isDemoForced) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      {TABS.map(({ name, title, icon, testID }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarButtonTestID: testID,
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
