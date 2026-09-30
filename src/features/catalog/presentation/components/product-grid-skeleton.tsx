import { View } from 'react-native';

import { Skeleton } from '@/core/ui';

export function ProductGridSkeleton() {
  return (
    <View testID="catalog-skeleton" className="flex-row flex-wrap">
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} className="w-1/2 p-1.5">
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Skeleton className="aspect-square w-full rounded-none" />
            <View className="gap-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
