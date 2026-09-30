import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { useRepositories } from '@/core/di';
import { getErrorPresentation } from '@/core/errors';
import { queryKeys } from '@/core/query';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  Screen,
  Skeleton,
  TextField,
  showToast,
} from '@/core/ui';
import { useAuthStore } from '@/features/auth/presentation/auth.store';
import { useMyProfile } from '@/features/auth/presentation/hooks/use-my-profile';
import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';
import type { ShippingAddress } from '@/features/checkout/domain/shipping-address';
import { DemoBanner } from '@/features/demo/presentation/components/demo-banner';

import { fullNameSchema, type Profile } from '../../domain/profile';
import { ThemeSelector } from '../components/theme-selector';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <AppText variant="label" tone="muted" className="uppercase">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function AddressSummary({ address }: { address: ShippingAddress | null }) {
  if (!address) return <AppText tone="muted">Add a default address</AppText>;
  return (
    <View testID="address-summary">
      <AppText variant="label">{address.fullName}</AppText>
      <AppText>{[address.line1, address.line2].filter(Boolean).join(', ')}</AppText>
      <AppText>
        {address.city}, {address.state} {address.postalCode} · {address.country}
      </AppText>
    </View>
  );
}

function NameForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const { profile: profiles } = useRepositories();
  const { control, handleSubmit } = useForm<{ fullName: string }>({
    resolver: zodResolver(fullNameSchema),
    defaultValues: { fullName: profile.fullName ?? '' },
  });
  const save = useMutation({
    mutationFn: (fullName: string) => profiles.update({ fullName }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      showToast('Saved', 'success');
    },
  });

  return (
    <View className="gap-3">
      <Controller
        control={control}
        name="fullName"
        render={({ field, fieldState }) => (
          <TextField
            label="Full name"
            testID="name-input"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoComplete="name"
            error={fieldState.error?.message}
          />
        )}
      />
      {save.isError ? (
        <AppText variant="caption" tone="danger">
          {getErrorPresentation(save.error).message}
        </AppText>
      ) : null}
      <Button
        title="Save"
        variant="secondary"
        testID="save-name-button"
        loading={save.isPending}
        onPress={handleSubmit(({ fullName }) => save.mutate(fullName))}
      />
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useRepositories();
  const mode = useSessionMode();
  const user = useAuthStore((s) => s.user);
  const profile = useMyProfile();

  const signOut = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: () => {
      useAuthStore.getState().setUser(null);
      queryClient.clear();
      showToast('Signed out');
    },
    onError: () => showToast("Couldn't sign out. Please try again.", 'danger'),
  });
  const signOutButton = (
    <Button
      title="Sign out"
      variant="secondary"
      testID="sign-out-button"
      loading={signOut.isPending}
      onPress={() => signOut.mutate()}
    />
  );

  const hasAccount = mode === 'live' || mode === 'demo';
  const email = mode === 'demo' ? 'demo@vitrina.app' : (user?.email ?? '');
  const name = profile.data?.fullName;

  return (
    <Screen scroll testID="account-screen">
      <AppText variant="title" className="py-4">
        Account
      </AppText>
      <View className="gap-6">
        {mode === 'demo' ? <DemoBanner /> : null}

        {mode === 'guest' || mode === 'unknown' ? (
          <Card className="gap-3" testID="account-guest">
            <AppText variant="subtitle">You&apos;re browsing as a guest</AppText>
            <AppText tone="muted">Sign in to check out and follow your orders.</AppText>
            <Button
              title="Sign in"
              testID="account-sign-in-button"
              onPress={() =>
                router.push({ pathname: '/sign-in', params: { redirect: '/account' } })
              }
            />
          </Card>
        ) : (
          <Card testID="account-header">
            <AppText variant="subtitle">{name || (profile.data ? 'Add your name' : email)}</AppText>
            {name || profile.data ? <AppText tone="muted">{email}</AppText> : null}
          </Card>
        )}

        {hasAccount ? (
          profile.isError ? (
            <View>
              <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
              {mode === 'live' ? signOutButton : null}
            </View>
          ) : !profile.data ? (
            <View className="gap-3" testID="account-skeleton">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
            </View>
          ) : (
            <>
              <Section title="Profile">
                <NameForm key={profile.data.fullName ?? ''} profile={profile.data} />
              </Section>
              <Section title="Default address">
                <Card className="gap-3">
                  <AddressSummary address={profile.data.defaultAddress} />
                  <Button
                    title={profile.data.defaultAddress ? 'Edit address' : 'Add address'}
                    variant="secondary"
                    testID="edit-address-button"
                    onPress={() => router.push('/account/address')}
                  />
                </Card>
              </Section>
            </>
          )
        ) : null}

        <Section title="Appearance">
          <ThemeSelector />
        </Section>

        {mode === 'live' && !profile.isError ? (
          <Section title="Session">{signOutButton}</Section>
        ) : null}

        <Section title="About">
          <AppText testID="app-version" tone="muted">
            Version {Constants.expoConfig?.version ?? '—'}
          </AppText>
        </Section>
      </View>
    </Screen>
  );
}
