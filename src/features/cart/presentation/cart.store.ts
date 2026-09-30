import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Product } from '@/features/catalog/domain/product';

import { addToCart, removeItem, updateQuantity, type AddToCartResult } from '../domain/add-to-cart';
import { calculateCartTotals } from '../domain/calculate-cart-totals';
import { cartUnitCount, MAX_LINES, MAX_QTY_PER_LINE, type CartItem } from '../domain/cart-item';

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
  snapshot: z.object({
    name: z.string(),
    priceCents: z.number().int().min(0),
    imageUrl: z.string().nullable(),
  }),
  addedAt: z.string(),
});

const persistedSchema = z.object({ items: z.array(cartItemSchema).max(MAX_LINES) });

/** Unknown versions or malformed data become an empty cart instead of crashing the app. */
export function migrateCart(persisted: unknown, version: number): { items: CartItem[] } {
  if (version !== 1) return { items: [] };
  const parsed = persistedSchema.safeParse(persisted);
  return parsed.success ? { items: parsed.data.items } : { items: [] };
}

interface CartState {
  items: CartItem[];
  add: (product: Product, quantity: number) => AddToCartResult;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  /** Used after reconciliation with the catalog. */
  replaceItems: (items: CartItem[]) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product, quantity) => {
        const result = addToCart(get().items, product, quantity, new Date());
        if (result.items !== get().items) set({ items: result.items });
        return result;
      },
      setQuantity: (productId, quantity) =>
        set((s) => ({ items: updateQuantity(s.items, productId, quantity) })),
      remove: (productId) => set((s) => ({ items: removeItem(s.items, productId) })),
      replaceItems: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'vitrina-cart',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
      migrate: (persisted, version) => migrateCart(persisted, version),
      // `migrate` only runs when the stored version differs: validate same-version data too.
      merge: (persisted, current) => ({ ...current, ...migrateCart(persisted, 1) }),
    },
  ),
);

export const useCartItems = (): CartItem[] => useCartStore((s) => s.items);

export const useCartUnitCount = (): number => useCartStore((s) => cartUnitCount(s.items));

export function useCartTotals() {
  const items = useCartItems();
  return calculateCartTotals(
    items.map((i) => ({ priceCents: i.snapshot.priceCents, quantity: i.quantity })),
  );
}

/** Non-hook access for actions outside React (e.g. entering demo mode). */
export const clearCart = (): void => useCartStore.getState().clear();
