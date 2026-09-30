import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '@/core/theme';
import { AppText, Price, QuantityStepper } from '@/core/ui';

import { MAX_QTY_PER_LINE, type CartItem } from '../../domain/cart-item';

interface CartLineProps {
  item: CartItem;
  onOpen: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartLine({ item, onOpen, onQuantityChange, onRemove }: CartLineProps) {
  const colors = useThemeColors();
  const { productId, snapshot, quantity } = item;
  return (
    <View
      testID={`cart-line-${productId}`}
      className="mb-3 flex-row gap-3 rounded-2xl border border-border bg-surface p-3"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${snapshot.name}`}
        onPress={() => onOpen(productId)}
        className="flex-1 flex-row gap-3 active:opacity-80"
      >
        <View className="size-20 overflow-hidden rounded-xl bg-surface-muted">
          {snapshot.imageUrl ? (
            <Image
              source={{ uri: snapshot.imageUrl }}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
              accessibilityLabel={snapshot.name}
            />
          ) : null}
        </View>
        <View className="flex-1 justify-between">
          <AppText variant="label" numberOfLines={2}>
            {snapshot.name}
          </AppText>
          <Price cents={snapshot.priceCents} />
        </View>
      </Pressable>
      <View className="items-end justify-between">
        <Pressable
          testID={`cart-remove-${productId}`}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${snapshot.name}`}
          onPress={() => onRemove(productId)}
          hitSlop={8}
          className="active:opacity-60"
        >
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </Pressable>
        <QuantityStepper
          testID={`cart-qty-${productId}`}
          value={quantity}
          min={1}
          max={MAX_QTY_PER_LINE}
          onChange={(q) => onQuantityChange(productId, q)}
        />
      </View>
    </View>
  );
}
