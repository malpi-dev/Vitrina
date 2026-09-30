# Fase 06 · Catálogo y detalle de producto

**Rama:** `feat/fase-06-catalogo`
**Objetivo:** Home con búsqueda, chips de categoría, modal de filtros, grid con paginación infinita y todos sus estados;
detalle de producto con galería y selector de cantidad. Funciona en **modo demo** y en **modo invitado contra Supabase
local** (repositorio `supabase` de productos + imágenes subidas al bucket).
**Referencias:** definición F3, F4, §5.2, §7.5 (Storage), §8.4 (staleTime), §12.1 (Catálogo, Detalle) ·
Agendo: `src/test/fake-supabase.ts`, `src/test/flash-list-mock.tsx`, `src/features/catalog/data/supabase-catalog-repository.ts`.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. `supabase start` (fase 04) y `supabase db reset` si hace falta.

## Paso 1 · Repositorio Supabase de productos

**`src/features/catalog/data/product.mapper.ts`**

```ts
type ProductRow = Database['vitrina']['Tables']['products']['Row'];
export function toProduct(row: ProductRow, publicUrl: (path: string) => string): Product
export function toCategory(row: CategoryRow): Category
```
snake_case → camelCase, `created_at` → `Date`, `image_paths` → `imageUrls` con `publicUrl`.

**`src/features/catalog/data/supabase-products.repository.ts`** (`implements ProductsRepository`):

- `publicUrl(path)` = `client.storage.from('vitrina-products').getPublicUrl(path).data.publicUrl`.
- `list(query)`:
  1. `client.from('products').select('*')` (el schema `vitrina` ya va en el cliente).
  2. `q` → `.ilike('name', \`%${escapeLike(q)}%\`)` donde `escapeLike` antepone `\` a `\`, `%` y `_`.
  3. `categoryId` → `.eq('category_id', …)`; `minCents` → `.gte('price_cents', …)`; `maxCents` → `.lte(…)`;
     `inStock` → `.gt('stock', 0)`.
  4. Orden: `newest` → `.order('created_at', { ascending: false }).order('id')`; `price_asc` → `.order('price_cents').order('id')`;
     `price_desc` → `.order('price_cents', { ascending: false }).order('id')`.
  5. Paginación: `offset = cursor ?? 0`, `size = pageSize ?? PRODUCT_PAGE_SIZE`; pide **una fila de más**
     (`.range(offset, offset + size)`) para saber si hay otra página: `nextCursor = rows.length > size ? offset + size : null`.
  6. Todo envuelto en `run()` (fase 02). RLS ya oculta los inactivos.
- `getById(id)`: `.eq('id', id).maybeSingle()`; `null` → `DomainError({ code: 'notFound', entity: 'product' })`.
- `getByIds(ids)`: si `ids` está vacío devuelve `[]` sin petición; si no `.in('id', ids)`.
- `listCategories()`: `.from('categories').select('*').order('sort_order')`.

En `createLiveRepositories` reemplaza el stub de productos por `new SupabaseProductsRepository(client)`.

**Tests** (`src/test/fake-supabase.ts`: adapta el de Agendo — proxy encadenable que registra cada llamada y responde
lo configurado; añade `storage.from().getPublicUrl()`):
- Cada filtro y orden produce las llamadas esperadas (`ilike` con el patrón escapado, `gte`, `lte`, `gt`, `order`, `range`).
- `nextCursor` con 21 filas → `20`; con 10 → `null`.
- Mapeo snake → camel, `Date`, `image_paths` → URLs públicas.
- `maybeSingle` nulo → `notFound`; `TypeError('Network request failed')` → `network`; `PGRST301` → `unauthorized`.
- `getByIds([])` no hace petición.

## Paso 2 · Subida de imágenes a Storage (`scripts/upload-product-images.mjs`)

- Lee `SUPABASE_URL` y `SUPABASE_SECRET_KEY` del entorno (`node --env-file=.env.scripts …`). Si faltan, sale con un
  mensaje claro. **Nunca** se importa desde la app.
- Sube cada archivo de `assets/products/` a `vitrina-products/<nombre>` con
  `upload(name, buffer, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })` y resume cuántos subió.
- Script: `"images:upload": "node --env-file=.env.scripts scripts/upload-product-images.mjs"`.
- Local: `.env.scripts` con `SUPABASE_URL=http://127.0.0.1:54321` y la secret key local (`supabase status`).
- **Ojo:** `supabase db reset` borra los metadatos de Storage; tras cada reset hay que volver a ejecutar `npm run images:upload`.
  Documéntalo en un comentario al inicio del script.
- Verifica: `curl -I http://127.0.0.1:54321/storage/v1/object/public/vitrina-products/ivory-stoneware-mug-1.webp` → 200.

## Paso 3 · Hooks de datos (`src/features/catalog/presentation/hooks/`)

- `use-catalog-filters.ts`: lee `useLocalSearchParams()` → `parseProductFilters`; expone `filters`, `setFilters(next)`
  (`router.setParams(...)` con **todas** las claves: las vacías como `undefined` para borrarlas) y `clearFilters()`
  (conserva `q` solo si así lo decides; documenta la decisión — por defecto **borra todo**, incluido `q`).
- `use-products.ts`: `useInfiniteQuery({ queryKey: queryKeys.products(filters), queryFn: ({ pageParam }) => products.list({ ...filters, cursor: pageParam }), initialPageParam: 0, getNextPageParam: (last) => last.nextCursor ?? undefined, staleTime: 5 * 60_000 })`.
- `use-categories.ts` (staleTime 5 min) y `use-product.ts` (`queryKeys.product(id)`, staleTime 5 min, sin reintentos si `notFound`).
- `src/core/hooks/use-debounced-value.ts`: `useDebouncedValue(value, 300)`.

## Paso 4 · Componentes

| Componente | Detalles | `testID` |
|---|---|---|
| `product-card.tsx` | `expo-image` (placeholder `bg-surface-muted`, `contentFit="cover"`, `transition={200}`, relación 1:1), nombre (2 líneas), `Price`. Badge "Out of stock" (`danger`) si `stock === 0`; "Only N left" (`warning`) si `stock ≤ 3`. `accessibilityLabel` = "Name, $X.XX[, out of stock]". | `product-card-<id>` |
| `category-chips.tsx` | Scroll horizontal: "All" + categorías; la activa en `bg-primary text-on-primary`. | `category-chip-all`, `category-chip-<slug>` |
| `search-bar.tsx` | `TextInput` con icono, botón de borrar, `returnKeyType="search"`; estado local + debounce 300 ms → `setFilters({ q })`. | `search-input`, `search-clear` |
| `product-grid-skeleton.tsx` | 6 tarjetas `Skeleton` en 2 columnas. | `catalog-skeleton` |
| `product-gallery.tsx` | `FlatList` horizontal `pagingEnabled` con 1–3 imágenes y puntos indicadores. | `product-gallery` |

## Paso 5 · Pantallas

**Catálogo** (`catalog-screen.tsx`, ruta `(tabs)/index.tsx`, reemplaza la provisional):
- Cabecera: "Vitrina" en `font-serif`, `SearchBar`, fila con `CategoryChips` y botón de filtros
  (`open-filters-button`, con contador de filtros activos de precio/stock/orden).
- `FlashList` con `numColumns={2}` (`testID="product-grid"`), `onEndReached` → `fetchNextPage` si `hasNextPage` y no
  está cargando; pie con spinner o, si falla la página, fila "Couldn't load more · Retry" (`load-more-retry`).
- Pull to refresh (`refetch`).
- Estados (definición §12.1): carga → `ProductGridSkeleton`; vacío → `EmptyState` "No products match your filters" +
  "Clear filters" (`clear-filters-button`); error → `ErrorState` con Retry.
- Tocar una tarjeta → `router.push('/product/<id>')`.

**Filtros** (`filters-screen.tsx`, ruta `src/app/filters.tsx`, `presentation: 'modal'` en el Stack raíz):
- Recibe los filtros actuales por *search params* (Home hace `router.push({ pathname: '/filters', params: toProductSearchParams(filters) })`).
- Campos: precio mínimo y máximo en dólares enteros (`filter-min-price`, `filter-max-price`, teclado numérico; si
  mín > máx se muestra error y no se aplica), interruptor "In stock only" (`filter-in-stock`), orden segmentado
  Newest / Price ↑ / Price ↓ (`sort-newest`, `sort-price-asc`, `sort-price-desc`).
- "Apply" (`apply-filters-button`) → `router.dismissTo({ pathname: '/', params })` conservando `q` y `category`.
  Si `dismissTo` no existe o no pasa los params en la versión instalada, usa `router.navigate({ pathname: '/', params })`
  y anótalo. "Reset" (`reset-filters-button`) limpia precio/stock/orden.

**Detalle** (`product-detail-screen.tsx`, ruta `src/app/product/[id].tsx`, header con back y sin título):
- `ProductGallery`, nombre (`font-serif`), `Price size="lg"`, nombre de categoría, texto de stock ("In stock",
  "Only N left", "Out of stock"), descripción.
- `QuantityStepper` (`testID="quantity-stepper"`) con `min=1`, `max=min(stock, 10)` (F4 CA1).
- Botón "Add to cart" (`add-to-cart-button`): **se conecta en la fase 07**; en esta fase se renderiza deshabilitado.
  Sin stock → deshabilitado con el texto "Out of stock".
- Estados: carga → skeleton de imagen + líneas; `notFound` → `EmptyState` "Product not available"
  (`product-not-available`) con "Back to catalog"; otro error → `ErrorState`.

## Paso 6 · Jest

- Añade en `jest.setup.js` el mock de FlashList de Agendo (`src/test/flash-list-mock.tsx`, que renderiza todas las filas):
  el `jestSetup` incluido en FlashList 2.0.x está roto (lección de Agendo).
- `expo-image` en Jest: si da problemas, mockéalo como un `View` con `testID`.

Tests mínimos: `ProductCard` (precio formateado, "Out of stock", "Only 2 left"); `CatalogScreen` con repos mock
(skeleton → productos; búsqueda "mug" → 3 tarjetas; vacío con Clear filters; error con Retry que reintenta);
`FiltersScreen` (mín > máx muestra error); `ProductDetailScreen` (stepper con máx = stock para stock 3; `notFound`).

## Paso 7 · Verificación manual

1. **Demo:** Home muestra 30 productos (20 + scroll infinito carga 10); "mug" → 3; chip Kitchen + "In stock only" +
   Price ↓ se combinan y la URL (params) lo refleja; Clear filters restaura; detalle de un producto con 3 imágenes
   permite deslizar; Chai Spice Mix muestra "Out of stock".
2. **Invitado contra Supabase local:** `.env` con URL `http://10.0.2.2:54321`, publishable key local,
   `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder`, `EXPO_PUBLIC_FORCE_DEMO=false`; `npm run images:upload`;
   `npx expo start --dev-client --clear`. Continue as guest → mismo catálogo con imágenes desde Storage.
3. Con Supabase detenido (`supabase stop`), el catálogo en invitado muestra `ErrorState` y Retry funciona al volver a arrancarlo.
4. Revisa claro y oscuro.

## Paso 8 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] `SupabaseProductsRepository` + mapper con tests (filtros, orden, paginación, mapeo, errores) y registrado en `createLiveRepositories`.
- [ ] Script `images:upload` probado contra Supabase local; imágenes visibles en modo invitado.
- [ ] Catálogo con búsqueda (debounce 300 ms), chips, filtros en *search params*, paginación infinita, pull to refresh y estados de carga/vacío/error (+ error de paginación).
- [ ] Detalle con galería, stepper limitado a `min(stock, 10)`, "Out of stock" y "Product not available".
- [ ] F3 CA1–CA4 y F4 CA1/CA3 verificados en demo y en invitado (F4 CA2 llega en la fase 07).
- [ ] `testID` de este archivo presentes.
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
