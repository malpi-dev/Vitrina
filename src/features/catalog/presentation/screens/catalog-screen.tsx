import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useThemeColors } from '@/core/theme';
import { AppText, Button, EmptyState, ErrorState, Screen } from '@/core/ui';

import type { Product } from '../../domain/product';
import { toProductSearchParams } from '../../domain/product-query';
import { CategoryChips } from '../components/category-chips';
import { ProductCard } from '../components/product-card';
import { ProductGridSkeleton } from '../components/product-grid-skeleton';
import { SearchBar } from '../components/search-bar';
import { useCatalogFilters } from '../hooks/use-catalog-filters';
import { useCategories } from '../hooks/use-categories';
import { useProducts } from '../hooks/use-products';

export default function CatalogScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { filters, setFilters, clearFilters } = useCatalogFilters();
  const categories = useCategories();
  const query = useProducts(filters);
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  const products = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  // Price, stock and sort live in the filters modal; the badge counts how many of those are set.
  const modalFilterCount =
    (filters.minCents !== undefined || filters.maxCents !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.sort !== 'newest' ? 1 : 0);

  const handleSearch = useCallback(
    (q: string) => setFilters({ ...filters, q: q || undefined }),
    [filters, setFilters],
  );
  const openProduct = useCallback(
    (product: Product) => router.push({ pathname: '/product/[id]', params: { id: product.id } }),
    [router],
  );
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const body = query.isPending ? (
    <ProductGridSkeleton />
  ) : query.isError && !data ? (
    // A failed next page also sets `isError`, but then the loaded pages stay visible (footer retry).
    <ErrorState error={query.error} onRetry={() => void query.refetch()} testID="catalog-error" />
  ) : (
    <FlashList
      testID="product-grid"
      data={products}
      numColumns={2}
      keyExtractor={(product) => product.id}
      renderItem={({ item }) => <ProductCard product={item} onPress={openProduct} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching && !isFetchingNextPage}
      ListEmptyComponent={
        <EmptyState
          testID="catalog-empty"
          icon="search-outline"
          title="No products match your filters"
          actionLabel="Clear filters"
          actionTestID="clear-filters-button"
          onAction={clearFilters}
        />
      }
      ListFooterComponent={
        isFetchNextPageError ? (
          <View testID="load-more-error" className="items-center gap-2 py-4">
            <AppText tone="muted">Couldn&apos;t load more</AppText>
            <Button
              title="Retry"
              variant="secondary"
              testID="load-more-retry"
              onPress={() => void fetchNextPage()}
            />
          </View>
        ) : isFetchingNextPage ? (
          <View testID="load-more-spinner" className="py-4">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );

  return (
    <Screen padded={false} testID="catalog-screen">
      <View className="gap-3 px-4 pb-2 pt-2">
        <AppText variant="display">Vitrina</AppText>
        <SearchBar value={filters.q ?? ''} onSearch={handleSearch} />
        <View className="flex-row items-center gap-2">
          <CategoryChips
            categories={categories.data ?? []}
            selectedId={filters.categoryId}
            onSelect={(categoryId) => setFilters({ ...filters, categoryId })}
          />
          <Pressable
            testID="open-filters-button"
            accessibilityRole="button"
            accessibilityLabel={
              modalFilterCount > 0 ? `Filters, ${modalFilterCount} active` : 'Filters'
            }
            onPress={() =>
              router.push({ pathname: '/filters', params: toProductSearchParams(filters) })
            }
            className="size-11 items-center justify-center rounded-xl border border-border bg-surface active:opacity-80"
          >
            <Ionicons name="options-outline" size={22} color={colors.text} />
            {modalFilterCount > 0 ? (
              <View
                testID="filters-count"
                className="absolute -right-1 -top-1 size-5 items-center justify-center rounded-full bg-primary"
              >
                <AppText variant="caption" tone="onPrimary" className="font-semibold text-xs">
                  {modalFilterCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
      <View className="flex-1 px-2.5">{body}</View>
    </Screen>
  );
}
