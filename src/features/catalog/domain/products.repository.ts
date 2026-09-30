import type { Category } from './category';
import type { Product } from './product';
import type { Page, ProductQuery } from './product-query';

export interface ProductsRepository {
  list(query: ProductQuery): Promise<Page<Product>>;
  /** Throws `notFound` (entity 'product') if missing or inactive. */
  getById(id: string): Promise<Product>;
  /** Only the ones that exist and are active; never throws `notFound`. */
  getByIds(ids: string[]): Promise<Product[]>;
  /** Ordered by `sortOrder`. */
  listCategories(): Promise<Category[]>;
}
