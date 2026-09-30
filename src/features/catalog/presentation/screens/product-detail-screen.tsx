import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { toDomainError } from '@/core/errors';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  Price,
  QuantityStepper,
  Skeleton,
} from '@/core/ui';

import { MAX_QTY_PER_LINE } from '@/features/cart/domain/cart-item';

import { ProductGallery } from '../components/product-gallery';
import { useCategories } from '../hooks/use-categories';
import { useProduct } from '../hooks/use-product';

function DetailSkeleton() {
  return (
    <View testID="product-skeleton">
      <Skeleton className="aspect-square w-full rounded-none" />
      <View className="gap-3 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </View>
    </View>
  );
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);
  const categories = useCategories();
  const [quantity, setQuantity] = useState(1);

  if (product.isPending) {
    return (
      <View className="flex-1 bg-background">
        <DetailSkeleton />
      </View>
    );
  }

  if (product.isError) {
    const notFound = toDomainError(product.error).code === 'notFound';
    return (
      <View className="flex-1 bg-background">
        {notFound ? (
          <EmptyState
            testID="product-not-available"
            icon="cube-outline"
            title="Product not available"
            message="It may have been removed or is no longer sold."
            actionLabel="Back to catalog"
            actionTestID="back-to-catalog-button"
            onAction={() => router.replace('/')}
          />
        ) : (
          <ErrorState
            error={product.error}
            onRetry={() => void product.refetch()}
            testID="product-error"
          />
        )}
      </View>
    );
  }

  const { data } = product;
  const soldOut = data.stock <= 0;
  const maxQuantity = Math.max(1, Math.min(data.stock, MAX_QTY_PER_LINE));
  const categoryName = categories.data?.find((c) => c.id === data.categoryId)?.name;
  const stockText = soldOut
    ? 'Out of stock'
    : data.stock <= 3
      ? `Only ${data.stock} left`
      : 'In stock';

  return (
    <ScrollView className="flex-1 bg-background" testID="product-detail-screen">
      <ProductGallery imageUrls={data.imageUrls} name={data.name} />
      <View className="gap-3 p-4">
        {categoryName ? (
          <AppText variant="label" tone="muted" testID="product-category">
            {categoryName}
          </AppText>
        ) : null}
        <AppText variant="display" testID="product-name">
          {data.name}
        </AppText>
        <Price cents={data.priceCents} size="lg" testID="product-price" />
        <AppText
          variant="label"
          tone={soldOut ? 'danger' : data.stock <= 3 ? 'warning' : 'success'}
          testID="product-stock"
        >
          {stockText}
        </AppText>
        <AppText tone="muted" testID="product-description">
          {data.description}
        </AppText>
        {!soldOut ? (
          <View className="flex-row items-center justify-between pt-2">
            <AppText variant="subtitle">Quantity</AppText>
            <QuantityStepper
              testID="quantity-stepper"
              value={Math.min(quantity, maxQuantity)}
              min={1}
              max={maxQuantity}
              onChange={setQuantity}
            />
          </View>
        ) : null}
        {/* Wired to the cart in phase 07. */}
        <Button
          title={soldOut ? 'Out of stock' : 'Add to cart'}
          testID="add-to-cart-button"
          disabled
          onPress={() => {}}
        />
      </View>
    </ScrollView>
  );
}
