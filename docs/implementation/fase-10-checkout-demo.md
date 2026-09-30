# Fase 10 · Checkout con pago simulado (modo demo)

**Rama:** `feat/fase-10-checkout-demo`
**Objetivo:** pantalla de checkout completa (dirección, resumen, "Pay $X.XX", todos los errores y avisos) y el
**presentador de pago** con su variante demo: la hoja *Simulated payment*. Al terminar, el flujo demo completo funciona
en modo avión: catálogo → carrito → checkout → pago simulado → detalle del pedido que avanza solo.
El pago real con Stripe se enchufa en la fase 11 sobre esta misma pantalla.
**Referencias:** definición F6 (CA1, CA3, CA4, CA5, CA7), F2 CA1–CA2, §5.1 C y D, §8.3 (Pago), §12.1 (Checkout, Pago simulado).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Presentador de pago (`src/features/checkout/presentation/payment/`)

El PaymentSheet de Stripe es un hook de React, por eso el pago vive en `presentation/` (definición §8.3):

```ts
// payment-presenter.tsx
export interface PaymentPresenter { present(session: CheckoutSession): Promise<PaymentOutcome> }
const PaymentPresenterContext = createContext<PaymentPresenter | null>(null);
export function usePaymentPresenter(): PaymentPresenter   // throws if there is no provider
export function PaymentPresenterRoot({ children }: { children: ReactNode })
// demo -> <SimulatedPaymentProvider>; live -> <StripePaymentProvider> (phase 11)
```

**Por qué un contexto y no un `if` dentro del hook:** el presentador live usa `useStripe()`, que exige
`StripeProvider`, y `StripeProvider` solo se monta en modo live (definición §8.3). Llamar a un hook u otro según el modo
rompería las reglas de hooks (`react-hooks/rules-of-hooks`). Con un proveedor por modo, cada árbol solo llama a sus hooks.
`PaymentPresenterRoot` se monta en `src/app/_layout.tsx` envolviendo el `Stack` (dentro del `RepositoryProvider`), y
como el árbol se vuelve a montar al cambiar de modo, nunca se mezclan.

- **Demo** (`simulated-payment-provider.tsx` + `simulated-payment.store.ts`):
  - Store Zustand **no persistido**: `pending: { session: CheckoutSession; resolve: (o: PaymentOutcome) => void } | null`,
    `open(session): Promise<PaymentOutcome>`, `settle(outcome)` (resuelve una sola vez y limpia `pending`).
  - `present(session)` → `open(session)` + `router.push('/checkout/simulated-payment')`.
- **Live** (`stripe-payment-provider.tsx`): en esta fase es un marcador (sin importar Stripe todavía) cuyo `present`
  devuelve `{ status: 'failed', reason: 'Card payments are not configured yet' }`. La fase 11 lo implementa.
  Todo esto vive en `src/features/checkout/presentation/payment/`, la única carpeta autorizada a importar `@stripe/*`.

## Paso 2 · Hoja de pago simulado (`simulated-payment-screen.tsx`, ruta `src/app/checkout/simulated-payment.tsx`)

- Registrada en el Stack raíz con `presentation: 'modal'` (o `formSheet` si la versión lo soporta bien en Android).
- Si no es modo demo o no hay `pending` → `router.back()` (solo accesible en demo, definición §5.2).
- Contenido: "Demo mode — no real charge" (`simulated-payment-notice`), total a pagar (`Price`), una tarjeta ficticia
  "•••• 4242" decorativa y dos botones:
  - "Pay (simulated)" (`simulated-pay-button`): spinner 1 s → `router.back()` → `settle({ status: 'succeeded' })`.
  - "Simulate failure" (`simulated-fail-button`): `router.back()` → `settle({ status: 'failed', reason: 'Card declined (simulated)' })`.
- Si la hoja se cierra de cualquier otra forma (gesto, botón atrás), en el `useEffect` de limpieza:
  `settle({ status: 'canceled' })` (no hace nada si ya se resolvió).
- Orden importante: primero cerrar la hoja y **después** resolver, para que la navegación posterior del checkout
  (`router.replace` al pedido) ocurra desde la pantalla de checkout y no desde el modal.

## Paso 3 · Pantalla de checkout (`checkout-screen.tsx`, ruta `src/app/checkout/index.tsx`, título "Checkout")

1. **Gates**: `useRequireSession('/checkout')` (invitado → *Sign in* con `redirect`, fase 08). Carrito vacío →
   `<Redirect href="/cart" />`.
2. `DemoBanner` arriba en demo (F2 CA2).
3. **Dirección**: `AddressForm` (fase 08) precargado con `profile.defaultAddress` (o `fullName` del perfil).
   Mientras carga el perfil, skeleton del formulario.
4. **Resumen** (`checkout-summary`): líneas del carrito (nombre × cantidad, `Price`) y totales con `useCartTotals()`.
5. **Botón** "Pay $X.XX" (`pay-button`, con el total local) — `loading` durante todo el proceso, sin dobles toques.

Lógica en `src/features/checkout/presentation/hooks/use-checkout-flow.ts`:

```text
pay(address):
  1. items = toCheckoutItems(cart.items)
  2. session = await checkout.startCheckout({ items, shippingAddress: address })     (mutation)
  3. if session.totalCents !== localTotals.totalCents:
       ask "Prices updated" — "Your new total is $X.XX." [Cancel] [Continue]           (Alert.alert)
       Cancel -> state = { kind: 'idle' } and return (the pending order will expire or be replaced)
  4. outcome = await presenter.present(session)
  5. await checkout.reportPaymentResult(session.orderId, outcome)   (ignore errors of this call)
  6. succeeded -> clearCart(); invalidate queryKeys.orders; router.replace(`/orders/${session.orderId}`)
     canceled  -> state = { kind: 'canceled' }
     failed    -> state = { kind: 'failed', reason }
```

Estados visibles (definición §12.1):

| Estado | UI | `testID` |
|---|---|---|
| `canceled` | Banner neutro "Payment canceled — your cart is intact". El carrito no cambia (F6 CA3). | `payment-canceled-banner` |
| `failed` | Banner de error con el motivo + "Try again" (vuelve a llamar a `pay`) (F6 CA4). | `payment-failed-banner` |
| `outOfStock` / `productUnavailable` (de `startCheckout`) | Banner que **lista los nombres** de los productos afectados (cruzando `productIds` con el carrito) + "Update cart" → `router.navigate('/cart')`, donde la reconciliación ajusta las cantidades (F6 CA5). | `stock-error-banner`, `update-cart-button` |
| `network` | "Couldn't reach the server" + Retry. | `checkout-network-error` |
| `validation` | Mensaje genérico "Please review your address and cart." | `checkout-validation-error` |
| `unauthorized` | Lo maneja el handler global (fase 08). | — |

## Paso 4 · Tests

Para controlar el resultado del pago, envuelve la pantalla en `PaymentPresenterContext.Provider` con un presentador
falso (`{ present: jest.fn().mockResolvedValue(...) }`); añade esa opción (`paymentPresenter`) a `renderWithProviders`.
Repos mock para el resto.

- `CheckoutScreen`:
  - Éxito: llama a `startCheckout` con **solo** `productId` y `quantity`, luego `reportPaymentResult`, vacía el carrito y
    hace `replace('/orders/<id>')` (F6 CA1).
  - Cancelado: banner y carrito intacto (F6 CA3). Fallido: banner con el motivo y "Try again" reintenta (F6 CA4).
  - `failNext({ code: 'outOfStock', productIds: [...] })` → banner con el nombre del producto (F6 CA5).
  - Total distinto: se muestra la confirmación (espía `Alert.alert`) y "Cancel" no presenta el pago.
  - Invitado → redirige a *Sign in* con `redirect=/checkout`; carrito vacío → `/cart`.
  - Precarga la dirección por defecto del perfil demo.
- `SimulatedPaymentScreen`: cada botón resuelve el resultado correcto; desmontar sin elegir → `canceled`; fuera de demo → `back()`.
- `simulated-payment.store`: `settle` solo resuelve una vez.

## Paso 5 · Verificación manual (demo, **modo avión**)

1. Explore demo → buscar "mug" → Ivory Stoneware Mug → Add to cart → Cart → Checkout.
2. Banner demo visible; dirección precargada ("Demo Shopper"); "Pay $X.XX" coincide con el total del carrito.
3. Pay → hoja *Simulated payment* → "Pay (simulated)" → detalle del pedido "Confirming payment…" → **Paid** (~2 s) →
   **Shipped** (~8 s) → **Delivered** (~15 s) sin tocar nada; el carrito está vacío; el pedido aparece en Orders
   (F2 CA1, F6 CA7, F7 CA4).
4. Repite con "Simulate failure" → banner de error y el carrito intacto. Repite cerrando la hoja con el gesto/atrás →
   banner de cancelado.
5. El stock del producto comprado bajó en el catálogo demo (p. ej. Manual Burr Grinder pasa a "Out of stock" tras comprar 1).
6. Captura pantallas en claro y oscuro para la bitácora (opcional).

## Paso 6 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] `PaymentPresenterRoot` + `usePaymentPresenter` con proveedor demo (hoja simulada) y marcador live; Stripe solo se importa en `payment/`.
- [ ] Checkout con gate, redirección de carrito vacío, dirección precargada, resumen y "Pay $X.XX".
- [ ] Flujo `startCheckout → (confirmación de total) → present → reportPaymentResult → navegación` con todos los estados de la tabla.
- [ ] Hoja *Simulated payment* con éxito, fallo y cancelación (F6 CA7); solo accesible en demo.
- [ ] Flujo demo completo verificado en modo avión, con estados que avanzan solos.
- [ ] `testID` de este archivo presentes (Maestro los usará en la fase 13).
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
