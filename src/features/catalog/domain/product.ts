export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: 'USD';
  categoryId: string;
  /** Already resolved public URLs (or local asset URIs in demo). */
  imageUrls: string[];
  stock: number;
  isActive: boolean;
  createdAt: Date;
}

export const isInStock = (p: Pick<Product, 'stock' | 'isActive'>): boolean =>
  p.isActive && p.stock > 0;
