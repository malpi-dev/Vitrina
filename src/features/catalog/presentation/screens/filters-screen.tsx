import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { useThemeColors } from '@/core/theme';
import { AppText, Button, HEADER_EDGES, Screen, TextField } from '@/core/ui';

import {
  parseProductFilters,
  toProductSearchParams,
  type ProductSort,
} from '../../domain/product-query';

const SORTS: { value: ProductSort; label: string; testID: string }[] = [
  { value: 'newest', label: 'Newest', testID: 'sort-newest' },
  { value: 'price_asc', label: 'Price ↑', testID: 'sort-price-asc' },
  { value: 'price_desc', label: 'Price ↓', testID: 'sort-price-desc' },
];

const PARAM_KEYS = ['q', 'category', 'min', 'max', 'inStock', 'sort'] as const;
const digitsOnly = (text: string): string => text.replace(/\D/g, '');
const toCents = (dollars: string): number | undefined =>
  dollars === '' ? undefined : Number(dollars) * 100;

/** Modal with the price range, stock switch and sort order. Applying it navigates back to Home with the params. */
export default function FiltersScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const current = parseProductFilters(params);

  const [min, setMin] = useState(
    current.minCents === undefined ? '' : String(current.minCents / 100),
  );
  const [max, setMax] = useState(
    current.maxCents === undefined ? '' : String(current.maxCents / 100),
  );
  const [inStock, setInStock] = useState(current.inStock === true);
  const [sort, setSort] = useState<ProductSort>(current.sort);

  const minCents = toCents(min);
  const maxCents = toCents(max);
  const rangeError =
    minCents !== undefined && maxCents !== undefined && minCents > maxCents
      ? 'Minimum price must not be higher than the maximum'
      : undefined;

  const apply = () => {
    if (rangeError) return;
    const encoded = toProductSearchParams({
      // `q` and `category` are kept: they are edited on Home, not here.
      ...(current.q !== undefined && { q: current.q }),
      ...(current.categoryId !== undefined && { categoryId: current.categoryId }),
      ...(minCents !== undefined && { minCents }),
      ...(maxCents !== undefined && { maxCents }),
      ...(inStock && { inStock }),
      sort,
    });
    // Every key is sent (empty ones as undefined) so Home drops the params that were cleared.
    const next: Record<string, string | undefined> = {};
    for (const key of PARAM_KEYS) next[key] = encoded[key];
    router.dismissTo({ pathname: '/', params: next });
  };

  const reset = () => {
    setMin('');
    setMax('');
    setInStock(false);
    setSort('newest');
  };

  return (
    <Screen scroll edges={HEADER_EDGES} testID="filters-screen" className="gap-6 pt-4">
      <View className="gap-3">
        <AppText variant="subtitle">Price (USD)</AppText>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Min"
              testID="filter-min-price"
              value={min}
              onChangeText={(t) => setMin(digitsOnly(t))}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={6}
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Max"
              testID="filter-max-price"
              value={max}
              onChangeText={(t) => setMax(digitsOnly(t))}
              keyboardType="number-pad"
              placeholder="Any"
              maxLength={6}
            />
          </View>
        </View>
        {rangeError ? (
          <AppText testID="filter-range-error" variant="caption" tone="danger">
            {rangeError}
          </AppText>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between">
        <AppText variant="subtitle">In stock only</AppText>
        <Switch
          testID="filter-in-stock"
          accessibilityLabel="In stock only"
          value={inStock}
          onValueChange={setInStock}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>

      <View className="gap-3">
        <AppText variant="subtitle">Sort by</AppText>
        <View className="flex-row gap-2">
          {SORTS.map((option) => {
            const active = sort === option.value;
            return (
              <Pressable
                key={option.value}
                testID={option.testID}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSort(option.value)}
                className={`min-h-11 flex-1 items-center justify-center rounded-xl border active:opacity-80 ${active ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
              >
                <AppText variant="label" tone={active ? 'onPrimary' : 'default'}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <Button
          title="Apply"
          testID="apply-filters-button"
          onPress={apply}
          disabled={rangeError !== undefined}
        />
        <Button title="Reset" variant="ghost" testID="reset-filters-button" onPress={reset} />
      </View>
    </Screen>
  );
}
