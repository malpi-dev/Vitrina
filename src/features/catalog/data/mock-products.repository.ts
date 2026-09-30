import { DomainError } from '@/core/errors';
import { clone } from '@/features/demo/data/clone';
import type { MockStore } from '@/features/demo/data/mock-store';

import type { Category } from '../domain/category';
import type { Product } from '../domain/product';
import {
  compareProducts,
  matchesFilters,
  PRODUCT_PAGE_SIZE,
  type Page,
  type ProductQuery,
} from '../domain/product-query';
import type { ProductsRepository } from '../domain/products.repository';

export class MockProductsRepository implements ProductsRepository {
  constructor(private readonly store: MockStore) {}

  async list(query: ProductQuery): Promise<Page<Product>> {
    await this.store.delay();
    this.store.takeFailure();
    const start = query.cursor ?? 0;
    const pageSize = query.pageSize ?? PRODUCT_PAGE_SIZE;
    const matching = this.store.products
      .filter((p) => matchesFilters(p, query))
      .sort(compareProducts(query.sort));
    const end = start + pageSize;
    return {
      items: clone(matching.slice(start, end)),
      nextCursor: end < matching.length ? end : null,
    };
  }

  async getById(id: string): Promise<Product> {
    await this.store.delay();
    this.store.takeFailure();
    const product = this.store.products.find((p) => p.id === id && p.isActive);
    if (!product) throw new DomainError({ code: 'notFound', entity: 'product' });
    return clone(product);
  }

  async getByIds(ids: string[]): Promise<Product[]> {
    await this.store.delay();
    this.store.takeFailure();
    return clone(this.store.products.filter((p) => p.isActive && ids.includes(p.id)));
  }

  async listCategories(): Promise<Category[]> {
    await this.store.delay();
    this.store.takeFailure();
    return clone([...this.store.categories].sort((a, b) => a.sortOrder - b.sortOrder));
  }
}
