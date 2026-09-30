# Fase 07 · Carrito persistente

**Rama:** `feat/fase-07-carrito`
**Objetivo:** carrito local (Zustand + persist en AsyncStorage) que sobrevive al cierre de la app, "Add to cart" en el
detalle con toast, pestaña Cart con stepper, eliminar, totales con la regla de envío, **reconciliación** con el catálogo
actual al abrirla, y badge con el número de unidades.
**Referencias:** definición F4 CA2, F5, §6.4, §6.5, §8.4 (storage del carrito), §12.1 (Carrito) · fase 03 (casos de uso del carrito).

> El carrito **no** es un repositorio (definición §6.5): es estado del cliente. Toda la lógica vive en `cart/domain`
> (fase 03); el store solo la aplica y la persiste.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Store (`src/features/cart/presentation/cart.store.ts`)

```ts
interface CartState {
  items: CartItem[];
  add(product: Product, quantity: number): AddToCartResult;   // uses addToCart(items, product, quantity, new Date())
  setQuantity(productId: string, quantity: number): void;      // updateQuantity
  remove(productId: string): void;                             // removeItem
  replaceItems(items: CartItem[]): void;                       // after reconciliation
  clear(): void;
}
```

- `persist` con `name: 'vitrina-cart'`, `storage: createJSONStorage(() => AsyncStorage)`, `version: 1`,
  `partialize: (s) => ({ items: s.items })` y un `migrate(persisted, version)` que, para versiones desconocidas o datos
  con forma inválida, devuelve `{ items: [] }` (valida con un esquema zod pequeño de `CartItem` en el propio archivo
  del store, no en `domain/`).
- Selectores exportados: `useCartItems()`, `useCartUnitCount()` (usa `cartUnitCount`), `useCartTotals()`
  (usa `calculateCartTotals` sobre los snapshots).
- **Añade `clearCart()` a `useDemoActions()`** (fase 05): entrar o salir del demo vacía el carrito (F2 CA3). El sign
  out **no** lo vacía (F1 CA3).

Tests (`cart.store.test.ts`, con el mock de AsyncStorage): añadir/combinar/eliminar; persistencia y **rehidratación**
(escribe, crea un store nuevo con `persist.rehydrate()`, lee); `migrate` con datos corruptos → carrito vacío;
`useDemoActions().enterDemo()` vacía el carrito.

## Paso 2 · Add to cart en el detalle

En `product-detail-screen.tsx` (fase 06) conecta `add-to-cart-button`:
- `const result = add(product, quantity)` y toast según `result.outcome` (F4 CA2):
  - `added`/`merged` → "Added to cart" (`success`).
  - `clamped` → "Only {limit} available — cart updated to {quantity}" (`warning`).
  - `rejected/lineFull` → "You already have the maximum for this item" (`warning`).
  - `rejected/tooManyLines` → "Your cart is full (20 items max)" (`warning`).
  - `rejected/outOfStock` → "Out of stock" (`danger`).
- Tras añadir, el stepper vuelve a 1. El `max` del stepper descuenta lo que ya hay en el carrito
  (`min(stock, 10) − enCarrito`, mínimo 1; si llega a 0 el botón se deshabilita con "Max in cart").

## Paso 3 · Reconciliación (`src/features/cart/presentation/hooks/use-reconciled-cart.ts`)

Al abrir la pestaña Cart (y al volver a enfocarla, `useFocusEffect`):
1. `useQuery({ queryKey: queryKeys.productsByIds(ids), queryFn: () => products.getByIds(ids), enabled: ids.length > 0, staleTime: 0 })`.
2. Cuando llega `data`: `const { items, notices } = reconcileCart(currentItems, data)`; si `items !== currentItems`,
   `replaceItems(items)`. Guarda `notices` en estado local para mostrarlas (no se persisten).
3. Devuelve `{ items, notices, status: 'checking' | 'ok' | 'offline', dismissNotice(i) }`:
   - `checking`: mientras la consulta está en curso (overlay ligero sobre los totales, definición §12.1).
   - `offline`: si la consulta falla con `network` → se muestra el carrito con snapshots y el aviso
     "Prices will be confirmed at checkout".
4. Evita bucles: la clave depende de los **ids** ordenados, no de las cantidades; `replaceItems` solo si hubo cambios
   (`reconcileCart` devuelve la misma referencia si no los hay).

Tests del hook (con repos mock y `failNext`): precio cambiado → aviso y snapshot actualizado; producto con stock menor
→ cantidad ajustada; producto inexistente → eliminado con aviso; error de red → `offline` sin tocar el carrito.
(Para cambiar precio/stock en el mock, modifica `store.products` en el test antes de renderizar.)

## Paso 4 · Pantalla Cart (`src/features/cart/presentation/screens/cart-screen.tsx`, ruta `(tabs)/cart.tsx`)

- Lista (`FlashList`, `testID="cart-list"`) de líneas `CartLine` (`cart-line-<productId>`): imagen, nombre, precio
  unitario (`Price`), `QuantityStepper` (`cart-qty-<productId>`, máx 10 — el stock real se valida al reconciliar y en el
  checkout), botón eliminar (`cart-remove-<productId>`, con `accessibilityLabel` "Remove {name}"). Tocar la línea abre el detalle.
- Avisos de reconciliación arriba (`cart-notice-<index>`), cerrables:
  - `priceChanged` → "Price updated: {name} is now $X.XX" · `quantityAdjusted` → "Only {to} {name} available — quantity updated"
  - `removed/unavailable` → "{name} is no longer available and was removed" · `removed/outOfStock` → "{name} is out of stock and was removed".
- Resumen (`cart-summary`): Subtotal, Shipping ("Free" si es 0; si no, el importe y una pista
  "Add $X.XX more for free shipping"), Total — todo con `useCartTotals()` (F5 CA3).
- CTA "Checkout" (`checkout-button`) → `router.push('/checkout')` (la ruta llega en la fase 10; hasta entonces el botón
  existe pero la ruta no: déjalo navegando y verifica en la fase 10). Deshabilitado mientras `status === 'checking'`.
- Vacío: `EmptyState` "Your cart is empty" + "Browse products" (`browse-products-button`) → Home.

## Paso 5 · Badge de la pestaña

En `(tabs)/_layout.tsx`: `tabBarBadge: count > 0 ? count : undefined` para Cart, con `useCartUnitCount()` (F5 CA4).
Colores del badge desde tokens.

## Paso 6 · Verificación manual

1. Demo: añade 3 productos distintos (uno ×2), comprueba badge = 4, totales y "Add $X.XX more for free shipping".
2. Llega a ≥ $50 → envío "Free".
3. Mata la app (`adb shell am force-stop com.malpidev.vitrina`) y reábrela → mismas líneas y cantidades (F5 CA1).
4. Invitado + Supabase local: añade "Terracotta Stoneware Mug" ×3; en Studio cambia su stock a 1 y el precio de otro
   producto del carrito; vuelve a la pestaña Cart → avisos "quantity updated" y "Price updated" (F5 CA2). Desactiva un
   producto (`is_active = false`) → desaparece con aviso. Restaura con `supabase db reset` + `npm run images:upload`.
5. Exit demo / Explore demo vacían el carrito; en invitado el carrito se conserva al reiniciar.

## Paso 7 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] `cart.store` persistido y versionado con `migrate` seguro; tests de rehidratación.
- [ ] "Add to cart" con toasts por cada resultado de `addToCart` y límites de stock/10/20 respetados (F4 CA2).
- [ ] Reconciliación al abrir/enfocar Cart con avisos y modo `offline` (F5 CA2).
- [ ] Totales con la regla de envío y pista de envío gratis (F5 CA3); badge con unidades (F5 CA4).
- [ ] Carrito sobrevive a matar la app (F5 CA1); se vacía al entrar/salir del demo, no al cerrar sesión.
- [ ] `testID` de este archivo presentes.
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
