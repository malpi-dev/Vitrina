# Fase 09 · Pedidos y estado en vivo

**Rama:** `feat/fase-09-pedidos`
**Objetivo:** pestaña Orders (historial) y detalle del pedido con línea de tiempo, líneas con precios congelados,
dirección y totales; actualizaciones **en vivo** por Supabase Realtime (`postgres_changes` sobre `vitrina.orders`) y por
el emisor del `MockStore` en demo, con indicador "Live updates paused".
**Referencias:** definición F7, §6.2, §7.5 (Realtime), §8.4, §12.1 (Pedidos, Detalle) · `CLAUDE.md` (canales
`<app>:<tema>:<id>`) · fase 03 (`buildOrderTimeline`, `OrdersRepository`) · Agendo: `src/core/supabase/subscribe-broadcast.ts`
(patrón de suscripción y limpieza; Agendo usa Broadcast, aquí es `postgres_changes`).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Supabase local arrancado.

## Paso 1 · Repositorio Supabase de pedidos

**`src/features/orders/data/order.mapper.ts`**: fila de `orders` + `order_items` → `Order` (camelCase, fechas a `Date`,
`shipping_address` validada con `shippingAddressSchema` — si no valida, lanza `DomainError({ code: 'unknown' })`,
porque la RPC siempre la valida). Líneas ordenadas por `product_name`.

**`src/features/orders/data/supabase-orders.repository.ts`** (`implements OrdersRepository`):

- `list()` → `.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })` (RLS filtra por usuario).
- `getById(id)` → misma selección + `.eq('id', id).maybeSingle()`; `null` → `notFound` (entity `order`).
- `subscribe(filter, onChange, onStatus)`:
  1. Síncrono: crea un flag `closed = false` y devuelve `unsubscribe` de inmediato.
  2. Asíncrono: obtiene el `uid` de la sesión (si no hay, `onStatus('paused')` y termina), llama a
     `await client.realtime.setAuth()` (asegura el JWT del usuario en el socket) y, si `closed` ya es `true`, no sigue.
  3. Nombre del canal (convención global): `vitrina:orders:<uid>` para la lista y `vitrina:order:<orderId>` para el detalle.
  4. `client.channel(name).on('postgres_changes', { event: '*', schema: 'vitrina', table: 'orders', filter: orderId ? \`id=eq.${orderId}\` : \`user_id=eq.${uid}\` }, (payload) => { … })`
     → con el `id` de `payload.new`, llama a `this.getById(id)` (así llegan también las líneas) y luego a `onChange(order)`;
     los errores de ese `getById` se ignoran (el siguiente evento o el refresco lo corregirán).
  5. `.subscribe((status) => onStatus?.(status === 'SUBSCRIBED' ? 'live' : 'paused'))` (`CHANNEL_ERROR`,
     `TIMED_OUT` y `CLOSED` → `paused`).
  6. `unsubscribe()`: `closed = true` y, si el canal ya existe, `client.removeChannel(channel)`. Si el canal se crea
     después de `unsubscribe` (carrera), se elimina en cuanto se crea (lección de Agendo: 0 canales huérfanos).

Registra el repo en `createLiveRepositories`.

**Tests** (amplía `fake-supabase.ts` con `channel()`, `removeChannel`, `realtime.setAuth` y un método para emitir un
payload y un estado; referencia Agendo): `list`/`getById` (selección, orden, mapeo, `notFound`); `subscribe` crea el
canal con el nombre y el filtro correctos para lista y detalle; un payload provoca `getById` + `onChange`; los estados
se traducen a `live`/`paused`; `unsubscribe` antes de que termine `setAuth` no deja canales.

## Paso 2 · Hooks (`src/features/orders/presentation/hooks/`)

- `use-orders.ts`: `useQuery({ queryKey: queryKeys.orders, queryFn: () => orders.list(), staleTime: 30_000, enabled: mode === 'live' || mode === 'demo' })`.
- `use-order.ts`: `queryKeys.order(id)`, `staleTime: 30_000`, sin reintentos para `notFound`.
- `use-orders-live.ts` y `use-order-live.ts`: `useEffect` que llama a `orders.subscribe(...)` y en `onChange`:
  - `queryClient.setQueryData(queryKeys.order(order.id), order)`;
  - actualiza la lista: reemplaza el pedido si está, o lo **antepone** si es nuevo
    (`setQueryData(queryKeys.orders, (old) => …)`); si la lista no está en caché, `invalidateQueries`.
  - Devuelven `liveStatus: 'live' | 'paused' | 'connecting'`. Cuando el estado vuelve a `live` tras un `paused`,
    invalidan la consulta correspondiente (para no perder cambios ocurridos durante la desconexión).
  - Se desuscriben al desmontar y al cambiar de modo (demo ↔ live) — la dependencia es el objeto `orders` de `useRepositories()`.

## Paso 3 · Componentes

| Componente | Detalles | `testID` |
|---|---|---|
| `order-status-badge.tsx` | `pending_payment` → "Awaiting payment" (`warning`); `paid` → "Paid" (`success`); `shipped` → "Shipped" (`info`); `delivered` → "Delivered" (`success`); `canceled` → "Canceled" (`danger`). | `order-status-<orderId>` |
| `order-row.tsx` | `shortCode`, fecha (`Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })`), nº de artículos, `Price` del total, badge. | `order-row-<orderId>` |
| `order-timeline.tsx` | Usa `buildOrderTimeline`. 4 pasos verticales ("Order placed", "Paid", "Shipped", "Delivered") con icono (hecho ✓ / actual resaltado / pendiente atenuado) y fecha+hora si existe. Si `canceledAt`, una fila aparte en `danger`: "Canceled · {fecha}". `accessibilityLabel` por paso ("Paid, completed, Oct 6, 10:42 AM"). | `order-timeline`, `timeline-step-<key>` con `accessibilityState` |
| `live-indicator.tsx` | Solo visible si `liveStatus === 'paused'`: punto + "Live updates paused". | `live-paused-indicator` |

## Paso 4 · Pantallas

**Orders** (`orders-screen.tsx`, ruta `(tabs)/orders.tsx`; reemplaza la provisional y conserva la rama de invitado de la fase 08):
- `FlashList` (`orders-list`) de `OrderRow`; tocar → `router.push('/orders/<id>')`. Pull to refresh.
- `useOrdersLive()` activo mientras la pantalla está montada; `LiveIndicator` arriba.
- Estados: skeleton de 4 filas; vacío "No orders yet" + "Start shopping" (`start-shopping-button`) → Home; error con Retry.

**Detalle** (`order-detail-screen.tsx`, ruta `src/app/orders/[id].tsx`, título "Order {shortCode}"):
- Bloque de estado:
  - `pending_payment` → spinner + "Confirming payment…" (`confirming-payment`). Si pasan > 30 s desde que se montó la
    pantalla y sigue igual → "Taking longer than usual, pull to refresh" (`payment-slow-hint`). Si hay
    `lastPaymentError`, muéstralo debajo en `text-muted`.
  - `canceled` → "Expired — no charge was made" (`order-canceled-note`).
  - resto → `OrderStatusBadge` grande.
- `OrderTimeline`, líneas (nombre × cantidad y total de línea con precios **congelados**), dirección de envío y totales
  (Subtotal, Shipping — "Free" si 0 —, Total).
- `useOrderLive(id)` + `LiveIndicator`. Pull to refresh.
- Estados: skeleton; `notFound` → `EmptyState` "Order not found" con "Back to orders"; error con Retry.

## Paso 5 · Tests

- `OrderTimeline`: paso actual por estado y rama cancelada.
- `OrdersScreen` (demo): muestra los 3 pedidos de ejemplo ordenados; vacío (store sin pedidos); invitado → CTA de sign in.
- `OrderDetailScreen` (demo, fake timers): con un pedido `pending_payment` creado en el `MockStore` y
  `store.startLifecycle(id)`, la pantalla pasa de "Confirming payment…" a "Paid" a los 2 s **sin interacción** y a
  "Shipped" a los 8 s (F7 CA1 y CA4 con el mock). Hint de 30 s.
- Hooks live: `setQueryData` actualiza lista y detalle; al pasar de `paused` a `live` se invalida.

## Paso 6 · Verificación manual con Supabase local (Realtime real)

Todavía no hay checkout, así que crea un pedido por SQL para el usuario de la fase 08 (`shopper@vitrina.dev`).
Obtén su id en Studio (`auth.users`) y ejecuta con `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<USER_ID>","role":"authenticated"}', true);
select id, short_code, status from vitrina.create_order(
  '[{"productId":"00000000-0000-4000-8000-000000000207","quantity":1}]',
  '{"fullName":"Test Shopper","line1":"1 Main St","city":"Austin","state":"TX","postalCode":"78701","country":"US"}'
);
commit;
-- as postgres: simulate the webhook
update vitrina.orders set stripe_payment_intent_id = 'pi_dev_1' where short_code = '<CODE>';
select status from vitrina.mark_order_paid('pi_dev_1');
```

1. Con la app abierta en Orders (sesión de `shopper@vitrina.dev`), el pedido nuevo aparece al crearlo (INSERT en vivo).
2. Abre su detalle en "Confirming payment…"; al ejecutar `mark_order_paid` cambia a **Paid** sin tocar nada (F7 CA1).
3. `npm run db:advance -- -v code=<CODE> -v status=shipped` → lista y detalle muestran "Shipped" en < ~2 s (F7 CA2); luego `delivered`.
4. Con un segundo usuario (otro email) no se ve ese pedido (F7 CA3; RLS ya probado en pgTAP).
5. `supabase stop` con la app abierta → aparece "Live updates paused"; `supabase start` → vuelve y se refresca.
6. Studio → *Realtime* (o `select * from realtime.subscription` como postgres): al salir de las pantallas no quedan
   suscripciones huérfanas.

Anota en la bitácora cuánto tardó el cambio en llegar (objetivo < 2 s).

## Paso 7 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] `SupabaseOrdersRepository` con `postgres_changes`, nombres de canal `vitrina:orders:<uid>` / `vitrina:order:<id>`, `setAuth` y limpieza sin carreras; tests.
- [ ] Historial y detalle con línea de tiempo, líneas congeladas, dirección, totales y todos los estados de §12.1.
- [ ] Actualización en vivo en lista y detalle (live y demo) e indicador "Live updates paused" con resincronización.
- [ ] F7 CA1–CA4 verificados (CA1/CA2 contra Supabase local por SQL; CA4 con el mock en tests).
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
