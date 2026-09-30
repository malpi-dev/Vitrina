# Fase 03 · Dominio

**Rama:** `feat/fase-03-dominio`
**Objetivo:** modelos, interfaces de repositorio, casos de uso y validaciones **puros** (sin React, Expo, Supabase,
Stripe, Query ni Zustand) de todas las features, con tests exhaustivos. Es la base que usarán el mock (fase 05), el
backend (fase 04 replica las mismas reglas en SQL) y la UI.
**Referencias:** definición §6 completo, §8.3 · `00-guia-general.md` §4.1.

> Regla: si una función necesita "ahora", recibe `now: Date` como parámetro. Nada de `Date.now()` dentro de `domain/`.
> Cobertura objetivo: **100 % de líneas en `src/features/*/domain/`**.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Catálogo (`src/features/catalog/domain/`)

**`category.ts`**: `interface Category { id: string; slug: string; name: string; sortOrder: number }`.

**`product.ts`**:

```ts
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: 'USD';
  categoryId: string;
  imageUrls: string[];   // already resolved public URLs (or local asset URIs in demo)
  stock: number;
  isActive: boolean;
  createdAt: Date;
}
export const isInStock = (p: Pick<Product, 'stock' | 'isActive'>): boolean => p.isActive && p.stock > 0;
```

**`product-query.ts`**:

```ts
export type ProductSort = 'newest' | 'price_asc' | 'price_desc';
export const PRODUCT_PAGE_SIZE = 20;

export interface ProductFilters {
  q?: string;            // trimmed, non-empty
  categoryId?: string;
  minCents?: number;
  maxCents?: number;
  inStock?: boolean;
  sort: ProductSort;     // default 'newest'
}
export interface ProductQuery extends ProductFilters { cursor?: number; pageSize?: number } // cursor = offset
export interface Page<T> { items: T[]; nextCursor: number | null }
```

Funciones puras (filtros ↔ *search params* de la ruta Home, definición §5.2):

- `parseProductFilters(params: Record<string, string | string[] | undefined>): ProductFilters`
  - Claves: `q`, `category` (uuid), `min` y `max` en **dólares enteros** (`min=10` → `minCents=1000`), `inStock=1`, `sort`.
  - Valores inválidos se ignoran (no lanzan): `min=abc`, `sort=foo` (→ `newest`), números negativos.
  - Si `min > max`, se intercambian.
  - Arrays (Expo Router puede dar `string[]`): se usa el primer valor.
- `toProductSearchParams(filters: ProductFilters): Record<string, string>`: inverso; omite claves vacías y `sort=newest`.
- `hasActiveFilters(filters): boolean` (cualquier filtro distinto del orden por defecto).
- `matchesFilters(product: Product, filters: ProductFilters): boolean` y `compareProducts(sort)` — los usa el
  **mock** para comportarse igual que la consulta SQL: `q` sin distinguir mayúsculas sobre `name` (`includes`), rango
  inclusivo, `inStock` = `stock > 0`, solo `isActive`. Orden `newest` = `createdAt` desc y desempate por `id`.

**`products.repository.ts`** (definición §8.3):

```ts
export interface ProductsRepository {
  list(query: ProductQuery): Promise<Page<Product>>;
  getById(id: string): Promise<Product>;          // throws notFound (entity 'product') if missing/inactive
  getByIds(ids: string[]): Promise<Product[]>;    // only the ones that exist and are active; never throws notFound
  listCategories(): Promise<Category[]>;          // ordered by sortOrder
}
```

Tests `product-query.test.ts`: ida y vuelta `parse(toParams(x))`, cada valor inválido, intercambio min/max,
arrays, `hasActiveFilters`, `matchesFilters` (búsqueda "MUG" encuentra "Stoneware Mug", rango en los bordes,
inStock, inactivo excluido) y los tres órdenes con empate.

## Paso 2 · Carrito (`src/features/cart/domain/`)

**`cart-item.ts`**:

```ts
export interface CartItem {
  productId: string;
  quantity: number;                                              // 1..MAX_QTY_PER_LINE
  snapshot: { name: string; priceCents: number; imageUrl: string | null }; // display only, never used to charge
  addedAt: string;                                               // ISO string (persisted as JSON)
}
export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 20;
export const cartUnitCount = (items: CartItem[]): number => items.reduce((n, i) => n + i.quantity, 0);
```

**`shipping-policy.ts`**: `interface ShippingPolicy { flatCents: number; freeFromCents: number }` y
`DEFAULT_SHIPPING_POLICY = { flatCents: 499, freeFromCents: 5000 }` (definición §6.3 regla 7).

**`calculate-cart-totals.ts`**:

```ts
export interface CartTotals { subtotalCents: number; shippingCents: number; totalCents: number; itemCount: number }
export function calculateCartTotals(
  lines: { priceCents: number; quantity: number }[],
  policy: ShippingPolicy = DEFAULT_SHIPPING_POLICY,
): CartTotals
```

- `subtotal = Σ priceCents × quantity` (enteros; sin redondeos).
- `shipping = 0` si no hay líneas; `0` si `subtotal ≥ freeFromCents`; si no, `flatCents`.
- `total = subtotal + shipping`; `itemCount = Σ quantity`.
- **La RPC `create_order` (fase 04) aplica exactamente la misma regla.** Los casos de test de aquí se repiten en pgTAP.

**`add-to-cart.ts`** — tres funciones puras:

```ts
export type AddToCartResult =
  | { outcome: 'added' | 'merged'; items: CartItem[] }
  | { outcome: 'clamped'; items: CartItem[]; quantity: number }          // final quantity of the line
  | { outcome: 'rejected'; items: CartItem[]; reason: 'outOfStock' | 'tooManyLines' | 'invalidQuantity' | 'lineFull' };

export function addToCart(
  items: CartItem[],
  product: Pick<Product, 'id' | 'name' | 'priceCents' | 'stock' | 'isActive' | 'imageUrls'>,
  quantity: number,
  now: Date,
): AddToCartResult
export function updateQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] // clamps to 1..10
export function removeItem(items: CartItem[], productId: string): CartItem[]
```

Reglas de `addToCart` (definición F4 CA1–CA2, §6.4):
1. `quantity` no entero o < 1 → `rejected/invalidQuantity`.
2. Producto inactivo o `stock === 0` → `rejected/outOfStock`.
3. Límite de la línea: `limit = min(stock, MAX_QTY_PER_LINE)`.
4. Si ya existe la línea: si ya está en `limit` → `rejected/lineFull`; si `existing + quantity > limit` → la línea
   queda en `limit` → `clamped`; si no → `merged`. Actualiza el `snapshot` con los datos nuevos.
5. Línea nueva: si ya hay `MAX_LINES` líneas → `rejected/tooManyLines`; si `quantity > limit` → se añade con `limit`
   → `clamped`; si no → `added`. `snapshot.imageUrl = imageUrls[0] ?? null`, `addedAt = now.toISOString()`.
6. Nunca muta `items` (devuelve arrays nuevos). El orden de las líneas se conserva; las nuevas van al final.

**`reconcile-cart.ts`** (definición F5 CA2):

```ts
export type CartNotice =
  | { type: 'priceChanged'; productId: string; name: string; fromCents: number; toCents: number }
  | { type: 'quantityAdjusted'; productId: string; name: string; from: number; to: number }
  | { type: 'removed'; productId: string; name: string; reason: 'unavailable' | 'outOfStock' };

export function reconcileCart(items: CartItem[], fresh: Product[]): { items: CartItem[]; notices: CartNotice[] }
```

Para cada línea, buscando su producto en `fresh` por id:
- No está o `!isActive` → se elimina, aviso `removed/unavailable` (con el nombre del snapshot).
- `stock === 0` → se elimina, aviso `removed/outOfStock`.
- `quantity > min(stock, MAX_QTY_PER_LINE)` → se ajusta, aviso `quantityAdjusted`.
- `priceCents` distinto del snapshot → se actualiza, aviso `priceChanged`.
- Nombre e imagen del snapshot se actualizan en silencio.
- Una línea puede generar `priceChanged` **y** `quantityAdjusted`. Orden de avisos = orden de líneas.
- Sin cambios → devuelve **la misma referencia** `items` y `notices = []` (evita renders y escrituras inútiles).

Tests (definición §13): `calculateCartTotals` (carrito vacío, **$49.99 → envío $4.99**, **$50.00 → envío gratis**,
$50.01, cantidades múltiples, política personalizada); `addToCart` (cada outcome y reason, límite 10, límite de stock,
línea 21, no muta la entrada); `updateQuantity`/`removeItem`; `reconcileCart` (cada tipo de aviso, combinaciones,
misma referencia sin cambios); `cartUnitCount`.

## Paso 3 · Checkout (`src/features/checkout/domain/`)

**`shipping-address.ts`** (zod está permitido en `domain/`):

```ts
export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(100),
  line1: z.string().trim().min(1, 'Required').max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1, 'Required').max(80),
  state: z.string().trim().min(1, 'Required').max(80),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9 -]{3,10}$/, 'Invalid postal code'),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Use a 2-letter country code'),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Invalid phone').optional(),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
```

Convierte `''` en `undefined` para `line2`/`phone` antes de validar (p. ej. `z.preprocess` o `.or(z.literal('').transform(() => undefined))`).
El mismo esquema lo valida la RPC en SQL (campos obligatorios y longitudes; fase 04).

**`checkout-items.ts`**:

```ts
export interface CheckoutItemInput { productId: string; quantity: number }
export const toCheckoutItems = (items: CartItem[]): CheckoutItemInput[] => …;
export function validateCheckoutItems(items: CheckoutItemInput[]): void // throws DomainError({ code: 'validation' })
```
Reglas: 1–20 líneas, cantidades enteras 1–10, sin `productId` repetido (definición §6.3 regla 2).

**`payment-outcome.ts`**:
`type PaymentOutcome = { status: 'succeeded' } | { status: 'canceled' } | { status: 'failed'; reason: string }`.

**`checkout-session.ts`**: `interface CheckoutSession { orderId: string; clientSecret?: string; totalCents: number }`
(`clientSecret` ausente en demo).

**`checkout.repository.ts`**:

```ts
export interface StartCheckoutInput { items: CheckoutItemInput[]; shippingAddress: ShippingAddress }
export interface CheckoutRepository {
  /** Creates the order with server prices and (live) the PaymentIntent. Throws outOfStock/productUnavailable/validation. */
  startCheckout(input: StartCheckoutInput): Promise<CheckoutSession>;
  /** Live: no-op (only the Stripe webhook marks orders as paid). Mock: drives the simulated order lifecycle. */
  reportPaymentResult(orderId: string, outcome: PaymentOutcome): Promise<void>;
}
```

Tests: esquema de dirección (válida, cada campo inválido, `country` en minúsculas se normaliza, vacíos opcionales),
`validateCheckoutItems` (0 líneas, 21 líneas, cantidad 0/11/1.5, duplicado).

## Paso 4 · Pedidos (`src/features/orders/domain/`)

**`order-status.ts`**:

```ts
export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'canceled';
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'canceled'],
  paid: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  canceled: ['paid'], // late payment recovery, only via mark_order_paid (bitácora, decisión "Plan")
};
export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => TRANSITIONS[from].includes(to);
```

**`order.ts`**:

```ts
export interface OrderItem { productId: string; productName: string; unitPriceCents: number; quantity: number; lineTotalCents: number }
export interface Order {
  id: string;
  shortCode: string;        // e.g. VT-7K3Q
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: 'USD';
  shippingAddress: ShippingAddress;
  lastPaymentError: string | null;
  createdAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  canceledAt: Date | null;
}
```

**`build-order-timeline.ts`**:

```ts
export type TimelineStepKey = 'placed' | 'paid' | 'shipped' | 'delivered';
export interface TimelineStep { key: TimelineStepKey; state: 'done' | 'current' | 'upcoming'; at: Date | null }
export interface OrderTimeline { steps: TimelineStep[]; canceledAt: Date | null }
export function buildOrderTimeline(order: Pick<Order, 'status' | 'createdAt' | 'paidAt' | 'shippedAt' | 'deliveredAt' | 'canceledAt'>): OrderTimeline
```

- Siempre 4 pasos en orden `placed → paid → shipped → delivered`. `placed.at = createdAt`; los demás, su fecha.
- `current` = el último paso alcanzado según el estado (`pending_payment → placed`, `paid → paid`, `shipped → shipped`,
  `delivered → delivered`); los anteriores `done`; los posteriores `upcoming`.
- `canceled`: `placed` en `done`, el resto `upcoming`, y `canceledAt` relleno (la UI lo pinta aparte).

**`orders.repository.ts`**:

```ts
export type LiveStatus = 'live' | 'paused';
export type Unsubscribe = () => void;
export interface OrdersRepository {
  list(): Promise<Order[]>;                     // current user, newest first
  getById(id: string): Promise<Order>;          // throws notFound (entity 'order')
  subscribe(
    filter: { orderId?: string },               // no orderId = all orders of the current user
    onChange: (order: Order) => void,           // always a full, fresh Order
    onStatus?: (status: LiveStatus) => void,
  ): Unsubscribe;
}
```

Tests: `canTransition` (tabla completa 5×5), `buildOrderTimeline` (cada estado + cancelado + fechas nulas).

## Paso 5 · Auth y cuenta

**`src/features/auth/domain/`**
- `auth-user.ts`: `interface AuthUser { id: string; email: string }`.
- `validation.ts`: `emailSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')) })`
  (en zod 3: `z.string().trim().toLowerCase().email(…)`); `otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') })`.
- `auth.repository.ts`:
  ```ts
  export interface AuthRepository {
    sendCode(email: string): Promise<void>;
    verifyCode(email: string, code: string): Promise<AuthUser>;   // throws invalidCode / rateLimited
    signOut(): Promise<void>;
    getCurrentUser(): Promise<AuthUser | null>;
    onAuthChange(callback: (user: AuthUser | null) => void): () => void;
  }
  ```

**`src/features/account/domain/`**
- `profile.ts`: `interface Profile { id: string; fullName: string | null; defaultAddress: ShippingAddress | null }` y
  `fullNameSchema = z.object({ fullName: z.string().trim().min(1, 'Required').max(100) })`.
- `profile.repository.ts`:
  ```ts
  export interface ProfileRepository {
    ensureMine(): Promise<Profile>;   // calls vitrina.ensure_profile(); idempotent
    getMine(): Promise<Profile>;      // throws unauthorized if signed out
    update(patch: { fullName?: string; defaultAddress?: ShippingAddress | null }): Promise<Profile>;
  }
  ```

Tests: esquemas de email, OTP y nombre.

## Paso 6 · Comprobaciones

- `npm run lint` debe pasar **sin tocar la regla de `domain/`**. Si un archivo de dominio necesita algo prohibido, el
  diseño está mal: muévelo a `presentation/` o `data/`.
- `npx jest src/features --coverage --collectCoverageFrom='src/features/*/domain/**/*.ts'` → 100 % de líneas.
  Anota el resultado en la bitácora.

## Paso 7 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] Modelos e interfaces de `catalog`, `cart`, `checkout`, `orders`, `auth` y `account` en `domain/`, con los nombres de este archivo.
- [ ] Casos de uso: `parseProductFilters`/`toProductSearchParams`/`matchesFilters`, `calculateCartTotals`, `addToCart`, `updateQuantity`, `removeItem`, `reconcileCart`, `validateCheckoutItems`, `canTransition`, `buildOrderTimeline`.
- [ ] Los umbrales de envío $49.99 / $50.00 probados explícitamente.
- [ ] Cobertura de líneas 100 % en `domain/`; ningún `Date.now()` ni `new Date()` sin argumento dentro de `domain/`.
- [ ] lint (con la regla de arquitectura intacta)/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
