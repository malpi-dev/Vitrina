import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { useRepositories } from '@/core/di';
import { getErrorPresentation } from '@/core/errors';
import { useSessionStore } from '@/core/session';
import { useThemeColors } from '@/core/theme';
import { AppText, Button, Screen, TextField } from '@/core/ui';
import { useDemoActions } from '@/features/demo/presentation/hooks/use-demo-actions';

import { emailSchema } from '../../domain/validation';
import { safeRedirect } from '../safe-redirect';

interface EmailForm {
  email: string;
}

export default function SignInScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { auth } = useRepositories();
  const { enterDemo } = useDemoActions();
  const markWelcomeSeen = useSessionStore((s) => s.markWelcomeSeen);
  const redirect = safeRedirect(useLocalSearchParams<{ redirect?: string }>().redirect);

  const { control, handleSubmit } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const sendCode = useMutation({
    mutationFn: (email: string) => auth.sendCode(email),
    onSuccess: (_data, email) =>
      router.push({
        pathname: '/verify',
        params: redirect ? { email, redirect } : { email },
      }),
  });

  const closeSignIn = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen scroll testID="sign-in-screen">
      {redirect ? (
        <Pressable
          testID="close-sign-in"
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={closeSignIn}
          hitSlop={12}
          className="min-h-12 min-w-12 items-end justify-center self-end"
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <View className="flex-1 justify-center gap-8 py-12">
        <View className="items-center gap-2">
          <AppText variant="display" className="text-5xl">
            Vitrina
          </AppText>
          <AppText tone="muted" className="text-center">
            Thoughtful goods for your everyday.
          </AppText>
        </View>

        <View className="gap-3">
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email"
                testID="email-input"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          {sendCode.isError ? (
            <AppText variant="caption" tone="danger" testID="send-code-error">
              {getErrorPresentation(sendCode.error).message}
            </AppText>
          ) : null}
          <Button
            title="Continue with email"
            testID="send-code-button"
            loading={sendCode.isPending}
            onPress={handleSubmit(({ email }) => sendCode.mutate(email.trim().toLowerCase()))}
          />
        </View>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <AppText variant="caption" tone="muted">
            or
          </AppText>
          <View className="h-px flex-1 bg-border" />
        </View>

        <View className="gap-3">
          <Button
            title="Explore demo"
            testID="explore-demo-button"
            variant="secondary"
            onPress={() => {
              enterDemo();
              router.replace('/');
            }}
          />
          <AppText variant="caption" tone="muted" className="text-center">
            Try everything with sample data — no account, no real charges.
          </AppText>
          {redirect ? null : (
            <Button
              title="Continue as guest"
              variant="ghost"
              testID="continue-as-guest-button"
              onPress={() => {
                markWelcomeSeen();
                router.replace('/');
              }}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
