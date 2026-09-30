import type { Product } from './product';

export type ProductSort = 'newest' | 'price_asc' | 'price_desc';
export const PRODUCT_PAGE_SIZE = 20;

export interface ProductFilters {
  /** Trimmed, non-empty. */
  q?: string;
  categoryId?: string;
  minCents?: number;
  maxCents?: number;
  inStock?: boolean;
  /** Defaults to 'newest'. */
  sort: ProductSort;
}

/** `cursor` is an offset into the filtered, sorted result set. */
export interface ProductQuery extends ProductFilters {
  cursor?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: number | null;
}

type SearchParams = Record<string, string | string[] | undefined>;

const SORTS: readonly ProductSort[] = ['newest', 'price_asc', 'price_desc'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLE_NUMBER_RE = /^\d+$/;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Whole, non-negative dollars -> cents. Anything else is ignored. */
function parseDollars(value: string | undefined): number | undefined {
  const raw = value?.trim();
  if (!raw || !WHOLE_NUMBER_RE.test(raw)) return undefined;
  const dollars = Number(raw);
  return Number.isSafeInteger(dollars * 100) ? dollars * 100 : undefined;
}

/** Route search params -> filters. Invalid values are ignored, never thrown. */
export function parseProductFilters(params: SearchParams): ProductFilters {
  const filters: ProductFilters = { sort: 'newest' };

  const q = first(params.q)?.trim();
  if (q) filters.q = q;

  const category = first(params.category)?.trim();
  if (category && UUID_RE.test(category)) filters.categoryId = category;

  let minCents = parseDollars(first(params.min));
  let maxCents = parseDollars(first(params.max));
  if (minCents !== undefined && maxCents !== undefined && minCents > maxCents) {
    [minCents, maxCents] = [maxCents, minCents];
  }
  if (minCents !== undefined) filters.minCents = minCents;
  if (maxCents !== undefined) filters.maxCents = maxCents;

  if (first(params.inStock) === '1') filters.inStock = true;

  const sort = first(params.sort);
  if (sort && (SORTS as readonly string[]).includes(sort)) filters.sort = sort as ProductSort;

  return filters;
}

/** Inverse of `parseProductFilters`: omits empty keys and `sort=newest`. */
export function toProductSearchParams(filters: ProductFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) params.q = filters.q;
  if (filters.categoryId) params.category = filters.categoryId;
  if (filters.minCents !== undefined) params.min = String(Math.round(filters.minCents / 100));
  if (filters.maxCents !== undefined) params.max = String(Math.round(filters.maxCents / 100));
  if (filters.inStock) params.inStock = '1';
  if (filters.sort !== 'newest') params.sort = filters.sort;
  return params;
}

/** True when any filter differs from the default (the sort order alone does not count). */
export const hasActiveFilters = (filters: ProductFilters): boolean =>
  Boolean(filters.q) ||
  filters.categoryId !== undefined ||
  filters.minCents !== undefined ||
  filters.maxCents !== undefined ||
  filters.inStock === true;

/** Mirrors the SQL query so the mock behaves like the backend. Inactive products never match. */
export function matchesFilters(product: Product, filters: ProductFilters): boolean {
  if (!product.isActive) return false;
  if (filters.q && !product.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
  if (filters.categoryId !== undefined && product.categoryId !== filters.categoryId) return false;
  if (filters.minCents !== undefined && product.priceCents < filters.minCents) return false;
  if (filters.maxCents !== undefined && product.priceCents > filters.maxCents) return false;
  if (filters.inStock && product.stock <= 0) return false;
  return true;
}

const byId = (a: Product, b: Product): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byNewest = (a: Product, b: Product): number =>
  b.createdAt.getTime() - a.createdAt.getTime() || byId(a, b);

/** Comparator for `Array.prototype.sort`. Ties fall back to newest, then id (ascending). */
export function compareProducts(sort: ProductSort): (a: Product, b: Product) => number {
  switch (sort) {
    case 'price_asc':
      return (a, b) => a.priceCents - b.priceCents || byNewest(a, b);
    case 'price_desc':
      return (a, b) => b.priceCents - a.priceCents || byNewest(a, b);
    default:
      return byNewest;
  }
}
