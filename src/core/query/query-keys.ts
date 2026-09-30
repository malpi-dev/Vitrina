export const queryKeys = {
  products: (filters: unknown) => ['products', filters] as const,
  product: (id: string) => ['product', id] as const,
  productsByIds: (ids: string[]) => ['products-by-ids', [...ids].sort()] as const,
  categories: ['categories'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  profile: ['profile'] as const,
};
