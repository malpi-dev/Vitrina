import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useRepositories } from '@/core/di';
import { getErrorPresentation } from '@/core/errors';
import { queryKeys } from '@/core/query';
import { AppText, ErrorState, Screen, Skeleton, showToast } from '@/core/ui';
import { useMyProfile } from '@/features/auth/presentation/hooks/use-my-profile';
import { AddressForm } from '@/features/checkout/presentation/components/address-form';

export default function AddressScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile: profiles } = useRepositories();
  const profile = useMyProfile();

  const save = useMutation({
    mutationFn: (defaultAddress: Parameters<typeof profiles.update>[0]['defaultAddress']) =>
      profiles.update({ defaultAddress }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      showToast('Address saved', 'success');
      router.back();
    },
  });

  if (profile.isError) {
    return (
      <Screen testID="address-screen">
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="address-screen" className="pt-2">
      {profile.data ? (
        <View className="gap-4">
          {save.isError ? (
            <AppText variant="caption" tone="danger" testID="address-error">
              {getErrorPresentation(save.error).message}
            </AppText>
          ) : null}
          <AddressForm
            initialValue={profile.data.defaultAddress ?? undefined}
            defaultFullName={profile.data.fullName ?? ''}
            submitLabel="Save address"
            loading={save.isPending}
            onSubmit={(address) => save.mutate(address)}
          />
        </View>
      ) : (
        <View className="gap-4" testID="address-skeleton">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </View>
      )}
    </Screen>
  );
}
