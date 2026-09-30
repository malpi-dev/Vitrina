import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useRepositories } from '@/core/di';
import { getErrorPresentation } from '@/core/errors';
import { queryKeys } from '@/core/query';
import { useSessionStore } from '@/core/session';
import { AppText, Button, Screen, showToast } from '@/core/ui';

import { otpSchema } from '../../domain/validation';
import { useAuthStore } from '../auth.store';
import { OtpInput } from '../components/otp-input';
import { safeRedirect } from '../safe-redirect';

export const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ email?: string; redirect?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const redirect = safeRedirect(params.redirect);
  const { auth, profile } = useRepositories();
  const markWelcomeSeen = useSessionStore((s) => s.markWelcomeSeen);

  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const verify = useMutation({
    mutationFn: async (value: string) => {
      const user = await auth.verifyCode(email, value);
      // Publish the user before navigating so gates (checkout) already see a signed-in session.
      useAuthStore.getState().setUser(user);
      // Best effort: `getMine` creates the profile later if this call fails.
      return profile.ensureMine().catch(() => null);
    },
    onSuccess: (created) => {
      if (created) queryClient.setQueryData(queryKeys.profile, created);
      markWelcomeSeen();
      router.replace((redirect ?? '/') as never);
    },
    onError: () => setCode(''),
  });

  const resend = useMutation({
    mutationFn: () => auth.sendCode(email),
    onSuccess: () => {
      setSecondsLeft(RESEND_SECONDS);
      showToast('A new code was sent', 'success');
    },
  });

  const submit = (value: string) => {
    if (otpSchema.safeParse({ code: value }).success && !verify.isPending) verify.mutate(value);
  };

  const onChange = (value: string) => {
    if (verify.isError) verify.reset();
    setCode(value);
    if (value.length === 6) submit(value);
  };

  const error = verify.isError ? verify.error : resend.isError ? resend.error : null;

  return (
    <Screen scroll testID="verify-screen" className="justify-center gap-6 pt-16">
      <View className="gap-2">
        <AppText variant="title">Enter your code</AppText>
        <AppText tone="muted">We sent a 6-digit code to {email}</AppText>
      </View>

      <OtpInput
        value={code}
        onChange={onChange}
        editable={!verify.isPending}
        hasError={verify.isError}
      />

      {error ? (
        <AppText variant="caption" tone="danger" testID="verify-error">
          {getErrorPresentation(error).message}
        </AppText>
      ) : null}

      <Button
        title="Verify"
        testID="verify-button"
        loading={verify.isPending}
        disabled={code.length !== 6}
        onPress={() => submit(code)}
      />
      <Button
        title={secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
        variant="ghost"
        testID="resend-code-button"
        loading={resend.isPending}
        disabled={secondsLeft > 0}
        onPress={() => resend.mutate()}
      />
      <Button
        title="Change email"
        variant="ghost"
        testID="change-email-button"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
