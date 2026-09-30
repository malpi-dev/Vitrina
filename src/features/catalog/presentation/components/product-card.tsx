import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { formatMoney } from '@/core/utils/money';
import { AppText, Badge, Price } from '@/core/ui';

import type { Product } from '../../domain/product';

const LOW_STOCK_THRESHOLD = 3;

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;
  const label = `${product.name}, ${formatMoney(product.priceCents)}${soldOut ? ', out of stock' : ''}`;

  return (
    <Pressable
      testID={`product-card-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(product)}
      className="m-1.5 flex-1 overflow-hidden rounded-2xl border border-border bg-surface active:opacity-80"
    >
      <View className="aspect-square w-full bg-surface-muted">
        {product.imageUrls[0] ? (
          <Image
            source={{ uri: product.imageUrls[0] }}
            contentFit="cover"
            transition={200}
            style={{ width: '100%', height: '100%', opacity: soldOut ? 0.5 : 1 }}
            accessibilityLabel={product.name}
          />
        ) : null}
      </View>
      <View className="gap-1 p-3">
        <AppText variant="label" numberOfLines={2} className="min-h-10">
          {product.name}
        </AppText>
        <Price cents={product.priceCents} />
        {soldOut ? (
          <Badge label="Out of stock" tone="danger" testID={`out-of-stock-${product.id}`} />
        ) : lowStock ? (
          <Badge
            label={`Only ${product.stock} left`}
            tone="warning"
            testID={`low-stock-${product.id}`}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
