import { DomainError } from '@/core/errors';
import { run, type VitrinaSupabaseClient } from '@/core/supabase';

import type { Category } from '../domain/category';
import type { Product } from '../domain/product';
import { PRODUCT_PAGE_SIZE, type Page, type ProductQuery } from '../domain/product-query';
import type { ProductsRepository } from '../domain/products.repository';

import { toCategory, toProduct } from './product.mapper';

const BUCKET = 'vitrina-products';

/** Escapes the LIKE wildcards so user input is matched literally. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

export class SupabaseProductsRepository implements ProductsRepository {
  constructor(private readonly client: VitrinaSupabaseClient) {}

  private publicUrl = (path: string): string =>
    this.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  async list(query: ProductQuery): Promise<Page<Product>> {
    const offset = query.cursor ?? 0;
    const size = query.pageSize ?? PRODUCT_PAGE_SIZE;

    let request = this.client.from('products').select('*');
    if (query.q) request = request.ilike('name', `%${escapeLike(query.q)}%`);
    if (query.categoryId !== undefined) request = request.eq('category_id', query.categoryId);
    if (query.minCents !== undefined) request = request.gte('price_cents', query.minCents);
    if (query.maxCents !== undefined) request = request.lte('price_cents', query.maxCents);
    if (query.inStock) request = request.gt('stock', 0);

    // The tie-breakers mirror `compareProducts` so mock and backend paginate identically.
    switch (query.sort) {
      case 'price_asc':
        request = request
          .order('price_cents')
          .order('created_at', { ascending: false })
          .order('id');
        break;
      case 'price_desc':
        request = request
          .order('price_cents', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id');
        break;
      default:
        request = request.order('created_at', { ascending: false }).order('id');
    }

    // One extra row tells us whether another page exists.
    const rows = await run(() => request.range(offset, offset + size));
    return {
      items: rows.slice(0, size).map((row) => toProduct(row, this.publicUrl)),
      nextCursor: rows.length > size ? offset + size : null,
    };
  }

  async getById(id: string): Promise<Product> {
    const row = await run(() =>
      this.client.from('products').select('*').eq('id', id).maybeSingle(),
    );
    if (!row) throw new DomainError({ code: 'notFound', entity: 'product' });
    return toProduct(row, this.publicUrl);
  }

  async getByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const rows = await run(() => this.client.from('products').select('*').in('id', ids));
    return rows.map((row) => toProduct(row, this.publicUrl));
  }

  async listCategories(): Promise<Category[]> {
    const rows = await run(() => this.client.from('categories').select('*').order('sort_order'));
    return rows.map(toCategory);
  }
}
