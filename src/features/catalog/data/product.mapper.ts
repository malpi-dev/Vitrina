import type { Database } from '@/core/supabase/database.generated';

import type { Category } from '../domain/category';
import type { Product } from '../domain/product';

type Tables = Database['vitrina']['Tables'];
export type ProductRow = Tables['products']['Row'];
export type CategoryRow = Tables['categories']['Row'];

/** snake_case row -> domain model. `publicUrl` resolves a Storage path to its public URL. */
export function toProduct(row: ProductRow, publicUrl: (path: string) => string): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: 'USD',
    categoryId: row.category_id,
    imageUrls: row.image_paths.map(publicUrl),
    stock: row.stock,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
  };
}

export function toCategory(row: CategoryRow): Category {
  return { id: row.id, slug: row.slug, name: row.name, sortOrder: row.sort_order };
}
