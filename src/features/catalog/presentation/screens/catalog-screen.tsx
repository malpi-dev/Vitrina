import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { queryKeys } from '@/core/query';
import { useRepositories } from '@/core/di';
import { AppText, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';
import type { ProductFilters } from '@/features/catalog/domain/product-query';

const FILTERS: ProductFilters = { sort: 'newest' };

/** Provisional list (phase 05). Phase 06 replaces it with search, filters and the product grid. */
export default function CatalogScreen() {
  const { products } = useRepositories();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.products(FILTERS),
    queryFn: () => products.list(FILTERS),
  });

  return (
    <Screen scroll testID="catalog-screen">
      <AppText variant="title" className="py-4">
        Home
      </AppText>
      {isPending ? (
        <View className="gap-3" testID="catalog-loading">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </View>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} testID="catalog-error" />
      ) : data.items.length === 0 ? (
        <EmptyState icon="storefront-outline" title="No products yet" testID="catalog-empty" />
      ) : (
        <View className="gap-2" testID="catalog-list">
          {data.items.map((product) => (
            <AppText key={product.id} testID={`product-name-${product.id}`}>
              {product.name}
            </AppText>
          ))}
        </View>
      )}
    </Screen>
  );
}
