import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useSessionStore } from '@/core/session';
import { AppText, Button, Screen } from '@/core/ui';
import { useDemoActions } from '@/features/demo/presentation/hooks/use-demo-actions';

export default function SignInScreen() {
  const router = useRouter();
  const { enterDemo } = useDemoActions();
  const markWelcomeSeen = useSessionStore((s) => s.markWelcomeSeen);

  return (
    <Screen scroll testID="sign-in-screen">
      <View className="flex-1 justify-center gap-8 py-16">
        <View className="items-center gap-2">
          <AppText variant="display" className="text-5xl">
            Vitrina
          </AppText>
          <AppText tone="muted" className="text-center">
            Thoughtful goods for your everyday.
          </AppText>
        </View>

        <View className="gap-3">
          <Button
            title="Explore demo"
            testID="explore-demo-button"
            onPress={() => {
              enterDemo();
              router.replace('/');
            }}
          />
          <AppText variant="caption" tone="muted" className="text-center">
            Try everything with sample data — no account, no real charges.
          </AppText>
        </View>

        <Button
          title="Continue as guest"
          variant="secondary"
          testID="continue-as-guest-button"
          onPress={() => {
            markWelcomeSeen();
            router.replace('/');
          }}
        />
      </View>
    </Screen>
  );
}
