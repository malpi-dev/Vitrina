import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';
import { AppText, Screen } from '@/core/ui';
import { DemoBanner } from '@/features/demo/presentation/components/demo-banner';

/** Provisional (phase 05); profile, address and theme arrive in phase 08. */
export default function AccountScreen() {
  const mode = useSessionMode();
  return (
    <Screen scroll testID="account-screen">
      <AppText variant="title" className="py-4">
        Account
      </AppText>
      {mode === 'demo' ? <DemoBanner /> : null}
    </Screen>
  );
}
