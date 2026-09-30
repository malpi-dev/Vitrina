# Vitrina — Documento de definición

| Campo | Valor |
|---|---|
| **Tagline** | Tienda móvil con catálogo, carrito persistente y checkout real con Stripe (modo test) |
| **Stack** | React Native · Expo (SDK estable más reciente) · Expo Router · TypeScript strict · Supabase · Stripe |
| **Plataforma** | Android (v1.0.0) · iOS fuera de la v1.0.0 (código compatible, no verificado) |
| **Estado** | 📋 Planificado |
| **Versión del documento** | 1.0 |
| **Fecha** | 2026-09-25 |
| **Bundle id / package** | `com.malpidev.vitrina` *(confirmado)* |

> Este documento define **qué** se construye y qué no. Es la base del plan de implementación, no el plan.
> Las reglas de `../CLAUDE.md` (arquitectura, stack, backend, seguridad, convenciones) son obligatorias y
> este documento solo las aplica a Vitrina. Si algo aquí las contradijera, manda `CLAUDE.md`.

---

## 1. Resumen del producto

**Qué es.** Vitrina es una app de e-commerce para una tienda pequeña (catálogo de ~30 productos de
estilo de vida: café, accesorios, papelería, hogar). El usuario explora el catálogo, busca y filtra,
agrega productos a un carrito que se conserva aunque cierre la app, paga con tarjeta mediante Stripe
PaymentSheet y sigue el estado de su pedido en vivo.

**Qué problema resuelve.** Es el caso de uso más pedido en freelance móvil: "quiero una app para vender
mis productos". Vitrina muestra el camino completo, desde el catálogo hasta el cobro y el seguimiento,
resuelto con buenas prácticas de seguridad (precio calculado en el servidor y clave secreta fuera del cliente).

**Para quién.**
- *Usuario final (ficticio):* cliente de una tienda que compra desde el móvil.
- *Audiencia real:* clientes freelance y reclutadores que revisan el portafolio. Deben poder probar la app
  en 30 segundos (botón **Explore demo**) o hacer un pago real en modo test con la tarjeta `4242 4242 4242 4242`.

**Qué demuestra en el portafolio ("Destaca").**
1. **Pago real en modo test**: `@stripe/stripe-react-native` PaymentSheet + Edge Function que crea el
   PaymentIntent (la clave secreta vive solo ahí) + webhook de Stripe verificado por firma que confirma el pedido.
2. **Estado del pedido en vivo**: tras pagar, la pantalla del pedido pasa de *"Confirmando pago…"* a *"Pagado"*
   sin refrescar, por Supabase Realtime. Los cambios posteriores (enviado, entregado) también llegan en vivo.
3. **El servidor manda**: el cliente solo envía `productId` y cantidad. Precio, envío, total y stock se
   calculan y validan en Postgres (RPC transaccional con bloqueo de filas).
4. **Carrito persistente** y offline-tolerante (Zustand + persist) que se reconcilia con precios y stock actuales.
5. **Clean Architecture ligera** con repositorios intercambiables (`supabase` / `mock`) y modo demo sin backend.

---

## 2. Usuarios y roles

| Rol | Cómo se obtiene | Qué puede hacer |
|---|---|---|
| **Invitado** | Abre la app y elige *"Continue as guest"* (o no ha iniciado sesión) | Ver catálogo, buscar, filtrar, ver detalle, gestionar el carrito. **No** puede pagar ni ver pedidos: al intentarlo se le pide iniciar sesión. |
| **Cliente autenticado** | Sign in con email + código OTP de 6 dígitos (sin contraseña) | Todo lo del invitado + checkout, historial de pedidos, detalle con estado en vivo, dirección de envío por defecto en su perfil. |
| **Demo** | Botón *"Explore demo"* | Igual que el cliente autenticado, pero con repositorios `mock`: usuario ficticio, pedidos de ejemplo y **pago simulado** (sin Stripe ni red). |

**Decisión: no hay rol admin en el MVP.** El alcance de `CLAUDE.md` para Vitrina no incluye gestión de
catálogo ni de pedidos desde la app, y añadirlo duplicaría pantallas sin reforzar lo que la app destaca. Los productos
se cargan con `seed.sql` y el Storage. Los cambios de estado posteriores al pago (`shipped`, `delivered`)
se hacen con una RPC restringida a la secret key, invocada desde un script (`supabase/scripts/advance-order.sql`)
o desde Supabase Studio. Eso basta para grabar la demo del estado en vivo. Un panel de administración queda en *Futuro*.

**Decisión: el invitado puede navegar sin cuenta.** Es el patrón estándar en e-commerce y reduce la fricción
para quien revisa el portafolio. La tabla `products` es legible por `anon`, y la sesión solo se exige al pagar.

---

## 3. Alcance del MVP

### 3.1 Incluye

Cada feature tiene criterios de aceptación (CA) verificables. Todas funcionan en modo live y en modo demo,
salvo que se indique otra cosa.

**F1. Autenticación (email + código OTP)**
- Convención común de las 4 apps: el usuario escribe su email, recibe un código de 6 dígitos y lo introduce. No hay
  contraseñas ni registro separado (el primer código crea la cuenta). Validación zod + React Hook Form. Sesión persistida (AsyncStorage).
- CA1: con un código válido, el usuario entra y la sesión sobrevive al reinicio de la app.
- CA2: con un código incorrecto o caducado se muestra un error tipado legible (`invalidCode` / `codeExpired`), no el mensaje crudo del SDK.
- CA3: "Sign out" desde Account vuelve al estado invitado, borra la caché de TanStack Query y conserva el carrito.
- CA4: tras verificar el código, la app llama a la RPC `vitrina.ensure_profile()` (idempotente), que crea su fila en `vitrina.profiles` si no existe.

**F2. Modo demo ("Explore demo")**
- Botón en la pantalla de sign in que cambia todos los repositorios a `mock`.
- CA1: en modo avión, *Explore demo* permite recorrer catálogo → carrito → checkout simulado → pedido con estados que avanzan solos.
- CA2: un banner persistente "Demo mode — no real charges" es visible en checkout y en Account, con acción "Exit demo".
- CA3: entrar o salir del modo demo vacía el carrito y la caché de consultas, para no mezclar datos.

**F3. Catálogo con búsqueda y filtros**
- Lista en grid (FlashList) con paginación infinita (20 por página). Búsqueda por nombre (debounce de 300 ms).
  Filtros: categoría (chips), rango de precio (mín/máx), "solo con stock". Orden: más nuevos, precio ↑, precio ↓.
- CA1: la búsqueda "mug" devuelve solo productos cuyo nombre contiene "mug" (sin distinguir mayúsculas).
- CA2: la combinación de filtros es acumulativa, se refleja en los parámetros de la ruta y tiene un botón "Clear filters".
- CA3: sin resultados se muestra un estado vacío con la acción "Clear filters". Si hay error, "Retry".
- CA4: los productos sin stock se muestran con la etiqueta "Out of stock" y no se pueden agregar al carrito.

**F4. Detalle de producto**
- Galería (1–3 imágenes con swipe), nombre, precio formateado, descripción, categoría, stock disponible,
  selector de cantidad (1…mín(stock, 10)), botón "Add to cart".
- CA1: la cantidad nunca supera el stock ni el máximo de 10 por línea.
- CA2: si el producto ya está en el carrito, el botón suma a la cantidad existente respetando los límites
  y muestra un toast de confirmación.
- CA3: un id inexistente o inactivo muestra el estado "Product not available".

**F5. Carrito persistente**
- Lista de líneas (imagen, nombre, precio unitario, stepper, eliminar), subtotal, envío, total y CTA "Checkout".
- CA1: con 3 productos en el carrito, al matar la app y volver a abrirla siguen los 3 con sus cantidades.
- CA2: al abrir el carrito se reconcilia con el catálogo actual. Si cambió un precio se muestra el aviso
  "Price updated". Si no hay stock suficiente, la cantidad se ajusta y se avisa. Si el producto ya no existe, se marca para eliminar.
- CA3: los totales siguen la regla de envío (§6.4) y coinciden al centavo con los que devuelve el servidor en el checkout.
- CA4: el badge de la pestaña Cart muestra el número total de unidades.

**F6. Checkout con Stripe (modo test)**
- Pantalla de checkout: dirección de envío (formulario validado, precargado con la dirección por defecto del perfil),
  resumen y botón "Pay $X.XX". Al pulsarlo se llama a la Edge Function `vitrina-create-payment-intent`, que crea
  el pedido con precios del servidor y devuelve el `clientSecret`. Luego se presenta el PaymentSheet.
- CA1: con la tarjeta `4242 4242 4242 4242` el pago se completa, el carrito se vacía y la app navega al detalle del pedido.
- CA2: el importe cobrado en Stripe es igual a `orders.total_cents`, calculado en el servidor. Manipular
  precios en el cliente no cambia el importe.
- CA3: si el usuario cierra el PaymentSheet, vuelve al checkout con el mensaje "Payment canceled — your cart is intact".
  El carrito no se vacía.
- CA4: con la tarjeta `4000 0000 0000 0002` (rechazada), el PaymentSheet muestra el error y permite reintentar.
  El pedido sigue en `pending_payment`.
- CA5: si el stock ya no alcanza, la Edge Function responde `outOfStock` con los ids afectados y la UI indica qué ajustar.
- CA6: el webhook `vitrina-stripe-webhook` verifica la firma, es idempotente (el mismo evento dos veces no produce
  dos efectos) y marca el pedido `paid`.
- CA7 (demo): se muestra una hoja de **pago simulado** con el aviso "Demo mode — no real charge" y los botones
  "Pay (simulated)" y "Simulate failure". No se carga el SDK de Stripe ni se hacen peticiones de red.

**F7. Historial de pedidos y estado en vivo**
- Lista de pedidos del usuario (más recientes primero): número corto, fecha, total, badge de estado.
- Detalle: línea de tiempo de estados, líneas del pedido (con precios congelados al comprar), dirección y totales.
- CA1: tras pagar, el detalle muestra "Confirming payment…" y cambia a "Paid" sin interacción cuando llega el webhook (Realtime).
- CA2: un cambio de estado hecho con `advance-order.sql` se refleja en la lista y en el detalle en menos de ~2 s.
- CA3: un usuario nunca ve pedidos de otro usuario (verificado por RLS, no solo por el filtro del cliente).
- CA4 (demo): los pedidos simulados avanzan solos `paid → shipped → delivered` con intervalos de unos segundos.

**F8. Cuenta y ajustes**
- Nombre, email, dirección por defecto (editable), tema (System / Light / Dark), sign out / exit demo, versión de la app.
- CA1: el tema elegido persiste entre sesiones y todas las pantallas lo respetan (modo oscuro completo).

### 3.2 Fuera del MVP

| No se hará | Por qué |
|---|---|
| Panel de admin / CRUD de productos en la app | No está en el alcance de `CLAUDE.md`; el catálogo se gestiona con seed + Studio. |
| Variantes de producto (talla, color) | Multiplica modelo, stock y UI; no aporta a lo que la app destaca. |
| Sincronizar el carrito entre dispositivos | El carrito es local (§6.5); sincronizarlo añade conflictos y tablas extra. |
| Wishlist / favoritos | Es otra feature más; no está en "Incluye". |
| Cupones, descuentos, impuestos | Cada uno complica el cálculo de totales en el servidor; el envío basta para mostrar la regla. |
| Múltiples monedas / i18n de precios | Una sola moneda (USD) mantiene el modelo simple. |
| Tarjetas guardadas (Stripe Customer + ephemeral key) | Requiere gestionar Customers; el PaymentSheet básico cumple. |
| Google Pay / Apple Pay | Requieren configuración de comercio y cuentas; se prueba solo tarjeta. |
| Reembolsos y cancelación de pedidos pagados por el usuario | Flujo de soporte, no de compra; requiere lógica de Stripe adicional. |
| Reseñas y valoraciones | Moderación y modelo adicional. |
| Contraseñas / magic link / OAuth | Convención común: email + código OTP (sin deep links de auth ni pantallas de contraseña). |
| Notificaciones push | No están en "Incluye" de Vitrina; el estado en vivo ya cubre el seguimiento. |
| Múltiples direcciones guardadas | Una dirección por defecto es suficiente. |
| Búsqueda full-text / sugerencias | `ilike` sobre el nombre basta para ~30 productos. |
| Modo offline del catálogo | El foco offline-first es de Centavo; aquí solo el carrito es local. |

### 3.3 Futuro / Roadmap

- Panel admin (rol `admin` en `vitrina.profiles`) para gestionar productos y avanzar estados de pedidos.
- Carrito sincronizado con el servidor para usuarios autenticados (merge al iniciar sesión).
- Wishlist, reseñas, productos relacionados.
- Google Pay / Apple Pay y tarjetas guardadas.
- Cupones y reglas de descuento en la RPC de totales.
- Push "Your order has shipped" (Edge Function + Expo Push).
- Búsqueda full-text (`tsvector`) y filtros por atributos.
- Deep links a producto (`vitrina://product/<id>`) para compartir.

---

## 4. Módulos / features

| Feature (`src/features/…`) | Descripción | Pantallas | ¿MVP? |
|---|---|---|---|
| `auth` | Email + código OTP, sesión, `ensure_profile` | Sign in, Enter code | Sí |
| `demo` *(transversal)* | Cambio a repositorios mock, banner, salida del modo demo | (botón en Sign in, banner global) | Sí |
| `catalog` | Productos, categorías, búsqueda, filtros, paginación | Catálogo (Home), Filtros (modal), Detalle de producto | Sí |
| `cart` | Carrito local persistente, reconciliación, totales | Cart | Sí |
| `checkout` | Dirección, creación de pedido + PaymentIntent, PaymentSheet / pago simulado | Checkout, Pago simulado (modal, solo demo) | Sí |
| `orders` | Historial, detalle, línea de tiempo, suscripción Realtime | Orders, Order detail | Sí |
| `account` | Perfil, dirección por defecto, ajustes | Account, Edit address | Sí |
| `settings/theme` *(transversal, en `core/theme`)* | Tema claro/oscuro/sistema persistido | (dentro de Account) | Sí |
| `admin` | Gestión de catálogo y pedidos | — | No |
| `wishlist` | Favoritos | — | No |

---

## 5. Flujos de usuario y navegación

### 5.1 Flujos principales

**A. Primer arranque**
1. La app abre en *Sign in* (solo la primera vez; se guarda `hasSeenWelcome`).
2. Opciones: iniciar sesión con email (código OTP) · **Explore demo** · "Continue as guest".
3. Cualquier opción lleva a las pestañas (Home = catálogo). En arranques posteriores se entra directo a las pestañas.

**B. Explorar y agregar al carrito**
1. Home → escribir en la búsqueda o tocar un chip de categoría → abrir el modal de filtros (precio, stock, orden).
2. Tocar un producto → detalle → elegir cantidad → "Add to cart" → toast "Added to cart" (el badge se actualiza).

**C. Checkout y pago (modo live)**
1. Cart → se reconcilia con el catálogo (avisos si hubo cambios) → "Checkout".
2. Si es invitado → *Sign in* (modal) → al autenticarse vuelve al checkout (redirección preservada).
3. Checkout: completar o confirmar la dirección → "Pay $X.XX".
4. La app llama a `vitrina-create-payment-intent` con `{ items: [{ productId, quantity }], shippingAddress }`.
   - La función (con el JWT del usuario) ejecuta la RPC `vitrina.create_order` → precios, envío, total y reserva de stock.
   - Crea el PaymentIntent en Stripe (`amount = total_cents`, `metadata.order_id`, idempotency key = `order_id`).
   - Guarda `stripe_payment_intent_id` en el pedido y devuelve `{ orderId, clientSecret, totalCents }`.
5. La app compara `totalCents` con el total local. Si difiere, muestra "Prices updated" con el nuevo total antes de continuar.
6. `initPaymentSheet` + `presentPaymentSheet`.
   - **Éxito** → vaciar carrito → `router.replace('/orders/<id>')` → "Confirming payment…".
   - **Cancelado** → vuelve al checkout con aviso; carrito intacto; el pedido queda `pending_payment` (se reutiliza o expira, §7.3).
   - **Fallido** → el PaymentSheet permite reintentar; si el usuario sale, se trata como cancelado.
7. Stripe → webhook `vitrina-stripe-webhook` (`payment_intent.succeeded`) → RPC `mark_order_paid` → UPDATE en
   `orders` → Realtime → el detalle cambia a **Paid**.

**D. Checkout en modo demo**
Pasos 1–3 iguales (el usuario demo ya está "autenticado"). En el paso 4, `MockCheckoutRepository` crea el pedido en
memoria con la misma función de totales. En el paso 6 se abre la hoja **Simulated payment**
("Demo mode — no real charge") con "Pay (simulated)" y "Simulate failure". Si el pago simulado tiene éxito, el
`MockOrdersRepository` emite `paid` a los 2 s, `shipped` a los 8 s y `delivered` a los 15 s a través de la misma interfaz de suscripción.

**E. Seguimiento de pedidos**
Orders (lista, suscrita a cambios del usuario) → Order detail (línea de tiempo + suscripción al pedido concreto).

### 5.2 Mapa de rutas (Expo Router)

```
app/
  _layout.tsx                 # Providers: QueryClient, RepositoryProvider, StripeProvider (solo live), Theme, SafeArea
  (auth)/
    _layout.tsx               # Stack; se presenta como modal cuando viene de un gate
    sign-in.tsx               # + "Explore demo" + "Continue as guest"
    verify.tsx                # código OTP de 6 dígitos
  (tabs)/
    _layout.tsx               # Tabs: Home · Cart · Orders · Account
    index.tsx                 # Catálogo (búsqueda + chips + grid)
    cart.tsx
    orders/
      index.tsx               # Historial (gate: requiere sesión o demo)
    account.tsx
  filters.tsx                 # Modal de filtros
  product/[id].tsx            # Detalle de producto
  checkout/
    index.tsx                 # Dirección + resumen + Pay (gate: requiere sesión o demo)
    simulated-payment.tsx     # Modal, solo accesible en modo demo
  orders/[id].tsx             # Detalle del pedido (en vivo)
  account/address.tsx         # Editar dirección por defecto
  +not-found.tsx
```

- Esquema de deep link: `vitrina://` (necesario también como `returnURL` del PaymentSheet).
- Gates: un hook `useRequireSession()` redirige a `/(auth)/sign-in?redirect=<ruta>` si no hay sesión ni demo.
- Filtros y búsqueda viven en los *search params* de Home (`?q=&category=&min=&max=&inStock=&sort=`).

---

## 6. Modelo de dominio

### 6.1 Entidades (TypeScript, `domain/`)

| Entidad | Campos clave | Notas |
|---|---|---|
| `Money` | `amountCents: number` (entero), `currency: 'USD'` | **Todos los importes en centavos enteros.** Formateo con `Intl.NumberFormat` solo en presentación. |
| `Category` | `id`, `slug`, `name`, `sortOrder` | |
| `Product` | `id` (uuid), `slug`, `name`, `description`, `priceCents`, `currency`, `categoryId`, `imageUrls: string[]`, `stock`, `isActive`, `createdAt` | `imageUrls` son URLs públicas ya resueltas por el repositorio. |
| `CartItem` | `productId`, `quantity`, `snapshot: { name, priceCents, imageUrl }`, `addedAt` | El *snapshot* sirve para pintar el carrito sin red; nunca se usa para cobrar. |
| `CartTotals` | `subtotalCents`, `shippingCents`, `totalCents`, `itemCount` | Resultado del caso de uso. |
| `ShippingAddress` | `fullName`, `line1`, `line2?`, `city`, `state`, `postalCode`, `country` (ISO-2), `phone?` | Validada con zod. |
| `Profile` | `id` (= `auth.users.id`), `fullName`, `defaultAddress?` | |
| `Order` | `id`, `shortCode` (p. ej. `VT-7K3Q`), `userId`, `status`, `items: OrderItem[]`, `subtotalCents`, `shippingCents`, `totalCents`, `currency`, `shippingAddress`, `createdAt`, `paidAt?`, `shippedAt?`, `deliveredAt?`, `canceledAt?` | |
| `OrderItem` | `productId`, `productName`, `unitPriceCents`, `quantity`, `lineTotalCents` | Precio y nombre **congelados** al crear el pedido. |
| `CheckoutSession` | `orderId`, `clientSecret?`, `totalCents` | `clientSecret` ausente en demo. |

Relaciones: `Category 1—N Product`; `Profile 1—N Order`; `Order 1—N OrderItem`; `OrderItem N—1 Product` (referencia, con datos congelados).

### 6.2 Estados del pedido

```
pending_payment ──(webhook succeeded)──▶ paid ──(script/Studio)──▶ shipped ──▶ delivered
       │
       └──(expira 30 min · reemplazado por otro checkout)──▶ canceled
```

| Desde → Hacia | Quién lo provoca | Permitido |
|---|---|---|
| `pending_payment → paid` | Webhook (`mark_order_paid`) | Sí |
| `pending_payment → canceled` | `create_order` (reemplazo o expiración) | Sí (restaura stock) |
| `paid → shipped` | `advance_order_status` (secret key) | Sí |
| `shipped → delivered` | `advance_order_status` (secret key) | Sí |
| Cualquier otra | — | No: el trigger lanza una excepción |

Un pago fallido **no** cambia el estado (sigue `pending_payment`, reintentable). El último error se guarda en
`last_payment_error` solo con fines informativos.

### 6.3 Reglas de negocio

1. El precio que se cobra es siempre `products.price_cents` en el momento de `create_order`. El cliente solo envía ids y cantidades.
2. Cantidad por línea: 1–10. Máximo 20 líneas por pedido.
3. Solo se venden productos `is_active = true` y con `stock >= quantity`.
4. El stock se **reserva** al crear el pedido y se **restaura** si el pedido pasa a `canceled`.
5. Un usuario tiene como máximo un pedido `pending_payment`: un nuevo checkout cancela el anterior.
6. Los pedidos `pending_payment` con más de 30 minutos caducan (cancelación perezosa, §7.3).
7. Envío: **$4.99 fijo; gratis si el subtotal ≥ $50.00**. Sin impuestos.
8. `total_cents = subtotal_cents + shipping_cents` (constraint en BD).
9. Moneda única: USD.

### 6.4 Casos de uso (solo donde hay lógica real)

| Caso de uso | Ubicación | Lógica |
|---|---|---|
| `calculateCartTotals(lines, policy)` | `cart/domain` | Subtotal, regla de envío y total. Es la misma regla que en la RPC y está cubierta por tests con los mismos casos. |
| `reconcileCart(items, freshProducts)` | `cart/domain` | Detecta cambios de precio, stock insuficiente (ajusta la cantidad), productos inactivos o eliminados. Devuelve el carrito nuevo + una lista de avisos. |
| `addToCart(items, product, qty)` | `cart/domain` | Fusiona líneas y aplica los límites (stock, 10 por línea, 20 líneas). |
| `buildOrderTimeline(order)` | `orders/domain` | Genera los pasos (hecho / actual / pendiente, con fechas) a partir del estado. `canceled` se representa aparte. |
| `canTransition(from, to)` | `orders/domain` | Máquina de estados (la usa el mock; la BD tiene su propio trigger). |

No hay casos de uso para "listar productos" o "obtener pedido": la presentación llama al repositorio directamente (regla 3 de `CLAUDE.md`).

### 6.5 Decisión: carrito solo local

El carrito vive **solo en el dispositivo** (Zustand + `persist` sobre AsyncStorage) y no se sincroniza con Supabase. Motivos:
- Funciona para invitados y en modo demo sin ninguna tabla ni política extra.
- El servidor recalcula todo en el checkout, así que el carrito local no es una fuente de verdad sensible.
- Sincronizarlo (merge al iniciar sesión, conflictos entre dispositivos) no está en "Incluye" y consumiría tiempo de la semana 2.

El carrito es **estado del cliente**, no un repositorio, por eso no tiene implementación `supabase`/`mock`.
La lógica (añadir, reconciliar, totales) es de dominio puro y se prueba sin React.

### 6.6 Errores de dominio tipados

`src/core/errors/domain-error.ts` define una unión discriminada por `code`:

| `code` | Cuándo | Datos extra |
|---|---|---|
| `network` | Sin conexión / timeout | — |
| `unauthorized` | Sesión ausente o expirada | — |
| `invalidCode` | Código OTP incorrecto | — |
| `codeExpired` | Código OTP caducado | — |
| `notFound` | Producto o pedido inexistente / no visible | `entity` |
| `validation` | Datos inválidos (cliente o servidor) | `fields?` |
| `outOfStock` | `create_order` rechaza por stock | `productIds[]` |
| `productUnavailable` | Producto inactivo en el checkout | `productIds[]` |
| `paymentCanceled` | El usuario cerró el PaymentSheet | — |
| `paymentFailed` | Tarjeta rechazada u otro error de Stripe | `reason` |
| `unknown` | Cualquier otro | `cause` (solo para logs) |

Convención común (regla 6 del `CLAUDE.md`): los repositorios **lanzan** `DomainError` (instancia de una clase con `code`)
en vez de devolver un `Result<T,E>`, porque TanStack Query ya modela el error con `throw`. Ningún error crudo de Supabase, PostgREST o Stripe
sale de `data/`: los traducen `mapSupabaseError`, `mapFunctionError` y `mapStripeError`. La RPC y la Edge Function
devuelven códigos estables (`outOfStock`, etc.) en el cuerpo del error para mapearlos sin depender de textos.

---

## 7. Backend: uso de Supabase

### 7.1 Schema `vitrina` y tablas

Todo vive en el schema `vitrina` del proyecto compartido y se expone en *API settings → Exposed schemas*.
Cliente: `supabase.schema('vitrina')`.

**`vitrina.profiles`**
| Columna | Tipo | Constraints |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` on delete cascade |
| `full_name` | `text` | `check (char_length(full_name) <= 100)` |
| `default_address` | `jsonb` | nullable |
| `created_at`, `updated_at` | `timestamptz` | default `now()` |

**`vitrina.categories`**
| Columna | Tipo | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `slug` | `text` | unique, not null |
| `name` | `text` | not null |
| `sort_order` | `int` | default 0 |

**`vitrina.products`**
| Columna | Tipo | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `slug` | `text` | unique, not null |
| `name` | `text` | not null |
| `description` | `text` | not null default `''` |
| `price_cents` | `integer` | not null, `check (price_cents > 0)` |
| `currency` | `char(3)` | not null default `'USD'`, `check (currency = 'USD')` |
| `category_id` | `uuid` | FK → `categories(id)` |
| `image_paths` | `text[]` | not null default `'{}'`; rutas dentro del bucket |
| `stock` | `integer` | not null, `check (stock >= 0)` |
| `is_active` | `boolean` | not null default true |
| `created_at`, `updated_at` | `timestamptz` | |

Índices: `(category_id)`, `(is_active, created_at desc)`, `(price_cents)`, índice trigram en `name` (`pg_trgm`) para `ilike`.

**`vitrina.orders`**
| Columna | Tipo | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `short_code` | `text` | unique, generado (`VT-` + 4 caracteres base32) |
| `user_id` | `uuid` | not null, FK → `auth.users(id)` |
| `status` | `vitrina.order_status` (enum) | `pending_payment`, `paid`, `shipped`, `delivered`, `canceled` |
| `subtotal_cents`, `shipping_cents`, `total_cents` | `integer` | `>= 0`; `check (total_cents = subtotal_cents + shipping_cents)` |
| `currency` | `char(3)` | default `'USD'` |
| `shipping_address` | `jsonb` | not null (snapshot) |
| `stripe_payment_intent_id` | `text` | unique, nullable |
| `last_payment_error` | `text` | nullable |
| `created_at`, `updated_at`, `paid_at`, `shipped_at`, `delivered_at`, `canceled_at` | `timestamptz` | |

Índices: `(user_id, created_at desc)`, índice parcial único `(user_id) where status = 'pending_payment'` (regla 5).

**`vitrina.order_items`**
| Columna | Tipo | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `orders(id)` on delete cascade |
| `product_id` | `uuid` | FK → `products(id)` |
| `product_name` | `text` | not null (snapshot) |
| `unit_price_cents` | `integer` | `> 0` |
| `quantity` | `integer` | `check (quantity between 1 and 10)` |
| `line_total_cents` | `integer` | generada: `unit_price_cents * quantity` |

`unique (order_id, product_id)`.

**`vitrina.stripe_events`** (idempotencia del webhook)
| Columna | Tipo | Constraints |
|---|---|---|
| `id` | `text` | PK (id del evento de Stripe `evt_…`) |
| `type` | `text` | not null |
| `received_at` | `timestamptz` | default `now()` |

### 7.2 RLS

RLS activado en **todas** las tablas. Cada política va comentada en la migración (`comment on policy …` + comentario SQL).

| Tabla | Política | Qué protege |
|---|---|---|
| `profiles` | `select`/`update` **to authenticated** `using/with check (id = auth.uid())`. Sin `insert` (lo hace `ensure_profile()`) ni `delete`. | Cada usuario solo lee y edita su propio perfil. |
| `categories` | `select` **to anon, authenticated** `using (true)`. Sin escritura. | El catálogo es público; solo la secret key / Studio lo modifica. |
| `products` | `select` **to anon, authenticated** `using (is_active)`. Sin escritura. | Los productos inactivos no se exponen; nadie puede cambiar precios ni stock desde el cliente. |
| `orders` | `select` **to authenticated** `using (user_id = auth.uid())`. **Sin insert/update/delete.** | Un usuario solo ve sus pedidos; solo las RPC `security definer` y la secret key pueden crear o cambiar pedidos (el cliente no puede autoasignarse `paid`). |
| `order_items` | `select` **to authenticated** `using (exists (select 1 from vitrina.orders o where o.id = order_id and o.user_id = auth.uid()))`. Sin escritura. | Las líneas heredan la visibilidad de su pedido. |
| `stripe_events` | RLS activo, **sin políticas**. | Solo accesible con la secret key (Edge Function). |

Realtime respeta RLS: la suscripción a `orders` solo entrega filas del propio usuario.

### 7.3 Lógica en BD

**Constraints:** los descritos en §7.1 (precio > 0, stock ≥ 0, cantidad 1–10, total = subtotal + envío, un solo pedido pendiente por usuario).

**Triggers**
- `set_updated_at` en `profiles`, `products`, `orders`.
- RPC `ensure_profile()` (`security definer`, idempotente): crea `vitrina.profiles` para `auth.uid()` si no existe y lo devuelve.
- `orders_enforce_status_transition` (`before update of status`): valida la máquina de estados de §6.2 y rellena
  `paid_at` / `shipped_at` / `delivered_at` / `canceled_at`. Una transición inválida lanza una excepción con el código `INVALID_TRANSITION`.

**RPCs** (todas `security definer`, `set search_path = ''`, nombres calificados)

| Función | Ejecutable por | Qué hace |
|---|---|---|
| `vitrina.create_order(p_items jsonb, p_shipping_address jsonb) returns vitrina.orders` | `authenticated` | En una transacción: (1) cancela los `pending_payment` caducados (>30 min) de cualquier usuario y el pendiente actual del llamante, restaurando stock; (2) valida la estructura de `p_items` (1–20 líneas, cantidades 1–10) y la dirección; (3) `select … for update` de los productos implicados; (4) si alguno está inactivo o sin stock, lanza `outOfStock` / `productUnavailable` con los ids; (5) descuenta stock; (6) calcula subtotal, envío (§6.3) y total **con precios de la BD**; (7) inserta `orders` + `order_items` con snapshot. Usa `auth.uid()`: nunca recibe `user_id` como parámetro. |
| `vitrina.attach_payment_intent(p_order_id uuid, p_payment_intent_id text)` | `service_role` | Guarda el id del PaymentIntent en el pedido (solo si es `pending_payment`). |
| `vitrina.mark_order_paid(p_payment_intent_id text)` | `service_role` | Idempotente: si ya está `paid` no hace nada. Pasa `pending_payment → paid`. Si el pedido estaba `canceled` (pago tardío tras la expiración), intenta re-reservar stock y marcarlo `paid`. Si no puede, registra el caso para reembolso manual (§17). |
| `vitrina.record_payment_failure(p_payment_intent_id text, p_message text)` | `service_role` | Actualiza `last_payment_error`. |
| `vitrina.advance_order_status(p_order_id uuid, p_status vitrina.order_status)` | `service_role` | Avanza el estado de un pedido (`paid → shipped → delivered`) para las demos. La usa `supabase/scripts/advance-order.sql`. |

`revoke execute … from public, anon` en todas las funciones; `grant` explícito solo al rol indicado.

**Decisión: la expiración es perezosa, sin `pg_cron`.** `pg_cron` está permitido con reglas (ver `CLAUDE.md`), pero la
convención prefiere la solución perezosa cuando alcanza: como el stock solo se consume en `create_order`, basta con
limpiar los pedidos caducados justo antes de reservar.

### 7.4 Auth y perfiles

- Método (convención común de las 4 apps): **email + código OTP de 6 dígitos** — `signInWithOtp({ email, options: { shouldCreateUser: true } })`
  + `verifyOtp({ email, token, type: 'email' })`. Sin contraseñas ni magic link (`auth.users` es compartido con las otras apps).
- Configuración compartida del proyecto: "Confirm email" activado, plantilla de email genérica con `{{ .Token }}`,
  SMTP por defecto de Supabase (solo entrega a miembros del equipo; ver `CLAUDE.md`). En local los correos llegan a la bandeja de Supabase (Inbucket/Mailpit).
- El perfil **no** se crea con un trigger sobre `auth.users`: ese trigger se ejecutaría con los registros de Agendo,
  Centavo y Rutta. En su lugar, tras verificar el código la app llama a la RPC `vitrina.ensure_profile()`
  (`security definer`, idempotente), único camino para crear perfiles.
- Sin roles en el MVP (sin columna `role`). Si se añade el admin en el futuro, irá en `vitrina.profiles.role`.
- Sesión persistida con AsyncStorage y `autoRefreshToken`, pausado/reanudado según `AppState`.

### 7.5 Realtime, Storage y Edge Functions

**Realtime — se usa.**
- La migración añade `vitrina.orders` a la publicación `supabase_realtime`.
- La lista de pedidos se suscribe (canal `vitrina:orders:<uid>`; los nombres de canal son globales al proyecto) a `postgres_changes` con `schema: 'vitrina', table: 'orders', filter: user_id=eq.<uid>`,
  y el detalle a `filter: id=eq.<orderId>`. Cada evento actualiza la caché de TanStack Query (`setQueryData`) y se invalida el detalle.
- `order_items` y `products` **no** se publican: no cambian en vivo durante el MVP.

**Storage — se usa.**
- Bucket público **`vitrina-products`**. El nombre lleva prefijo porque los buckets son globales en el proyecto compartido.
- Lectura pública; sin políticas de escritura para `anon`/`authenticated`. La carga la hace el script
  `scripts/upload-product-images.ts` (Node, usa la secret key local, nunca se empaqueta en la app).
- Imágenes WebP, ~800 px, < 120 KB. Las fuentes están en `supabase/seed-assets/products/`.
- El repositorio resuelve `image_paths` a URL pública (`getPublicUrl`). La UI recibe `imageUrls` ya resueltas.

**Edge Functions — solo las dos que necesitan clave secreta.** Los nombres llevan el prefijo `vitrina-` porque
las funciones también son globales en el proyecto compartido.

| Función | JWT | Qué hace |
|---|---|---|
| `vitrina-create-payment-intent` | **Verificado** (usuario autenticado) | Crea un cliente de Supabase con el `Authorization` del usuario → RPC `create_order` → `stripe.paymentIntents.create({ amount: total_cents, currency: 'usd', automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, metadata: { order_id, user_id } }, { idempotencyKey: order_id })` → `attach_payment_intent` con la secret key → responde `{ orderId, clientSecret, totalCents }`. Traduce los errores de la RPC a `{ code, productIds? }` con HTTP 409/422. |
| `vitrina-stripe-webhook` | **No verificado** (`--no-verify-jwt`; lo llama Stripe) | Verifica la firma (`stripe.webhooks.constructEventAsync` + `VITRINA_STRIPE_WEBHOOK_SECRET`) → inserta `event.id` en `stripe_events` (si ya existe, responde 200 sin hacer nada) → `payment_intent.succeeded` → `mark_order_paid`; `payment_intent.payment_failed` → `record_payment_failure`; el resto de eventos se ignora con 200. |

No se usan: Edge Functions para el catálogo (PostgREST + RLS bastan), push, ni Stripe Customers.

### 7.6 Migraciones, seed y entornos

```
supabase/
  migrations/
    20261005000100_vitrina_schema.sql         # schema, enum, tablas, índices, grants
    20261005000200_vitrina_rls.sql            # políticas comentadas
    20261005000300_vitrina_functions.sql      # triggers + RPCs
    20261005000400_vitrina_realtime_storage.sql # publicación + bucket vitrina-products
  seed.sql
  scripts/advance-order.sql
```

- Todas las migraciones empiezan con `create schema if not exists vitrina;` y solo tocan `vitrina` (y el bucket
  `vitrina-products` y la publicación Realtime, que requieren esas instrucciones concretas).
- **Local:** `supabase start` (Docker) aplica las migraciones y `seed.sql` en cada `supabase db reset`. Stripe CLI:
  `stripe listen --forward-to http://127.0.0.1:54321/functions/v1/vitrina-stripe-webhook`.
- **Remoto:** `psql "$SUPABASE_DB_URL" -f supabase/migrations/<archivo>.sql` en orden, y luego `seed.sql` una vez.
  **Nunca `supabase db push`** (historial de migraciones compartido). Funciones: `supabase functions deploy vitrina-create-payment-intent`
  y `supabase functions deploy vitrina-stripe-webhook --no-verify-jwt`. Secretos: `supabase secrets set VITRINA_…` (globales al proyecto, siempre con prefijo).
- **`seed.sql`**: 5 categorías (Coffee, Kitchen, Stationery, Accessories, Home) y 30 productos con nombres y descripciones
  realistas en inglés, precios entre $6 y $120, varios productos con stock bajo (1–3) y 2 con stock 0 para mostrar
  "Out of stock". Los UUID son fijos y **coinciden con los fixtures del mock**. No incluye usuarios ni pedidos: los pedidos
  de demo solo existen en el mock.

---

## 8. Arquitectura

### 8.1 Capas y reglas de dependencia

- `domain/`: tipos puros, interfaces de repositorio, casos de uso y errores. No importa React, React Native, Supabase, Stripe ni Zustand.
- `data/`: `supabase-*.repository.ts` y `mock-*.repository.ts` implementan las interfaces. Los mappers solo existen donde
  el formato difiere (snake_case de la BD → camelCase y `image_paths` → `imageUrls`, en `products` y `orders`).
- `presentation/`: pantallas, componentes y hooks (`useProducts`, `useOrder`, `useCheckout`…). Solo accede a los datos
  a través de los repositorios que entrega `useRepositories()`.
- `app/` (Expo Router) contiene archivos de ruta delgados que re-exportan pantallas de `features/*/presentation`.
- La UI **nunca** importa `@supabase/supabase-js`. Una regla de ESLint (`no-restricted-imports`) lo prohíbe fuera de
  `src/core/supabase` y `src/features/*/data`, y prohíbe importar `data/` o librerías de UI/backend desde `domain/`.

### 8.2 Árbol de archivos de ejemplo

```
Vitrina/
  app/                              # rutas Expo Router (§5.2)
  assets/
    images/ (icon, adaptive-icon, splash)
    demo-products/                  # imágenes empaquetadas para el modo demo
  src/
    core/
      config/env.ts                 # lectura + validación zod de EXPO_PUBLIC_*
      supabase/client.ts            # createClient + schema('vitrina')
      di/repositories.tsx           # RepositoryProvider, createLiveRepositories(), createMockRepositories()
      session/session.store.ts      # Zustand: mode 'guest'|'live'|'demo', hasSeenWelcome
      theme/                        # tokens, ThemeProvider, theme.store.ts
      errors/domain-error.ts        # DomainError + mappers compartidos
      query/query-client.ts
      ui/                           # Button, Price, EmptyState, ErrorState, Skeleton, DemoBanner, Toast
      utils/money.ts                # formatMoney(cents)
    features/
      auth/{domain,data,presentation}
      catalog/
        domain/  product.ts, category.ts, product-filters.ts, products.repository.ts
        data/    supabase-products.repository.ts, mock-products.repository.ts, product.mapper.ts
        presentation/ catalog-screen.tsx, product-detail-screen.tsx, filters-screen.tsx, use-products.ts, product-card.tsx
      cart/
        domain/  cart-item.ts, add-to-cart.ts, reconcile-cart.ts, calculate-cart-totals.ts, shipping-policy.ts
        presentation/ cart.store.ts (Zustand+persist), cart-screen.tsx, use-reconciled-cart.ts
      checkout/
        domain/  checkout.repository.ts, shipping-address.ts, payment-outcome.ts
        data/    supabase-checkout.repository.ts (invoca la Edge Function), mock-checkout.repository.ts
        presentation/ checkout-screen.tsx, simulated-payment-screen.tsx, use-payment-presenter.ts
      orders/
        domain/  order.ts, order-status.ts, build-order-timeline.ts, orders.repository.ts
        data/    supabase-orders.repository.ts (incluye subscribe), mock-orders.repository.ts, order.mapper.ts
        presentation/ orders-screen.tsx, order-detail-screen.tsx, order-timeline.tsx, use-order-live.ts
      account/{domain,data,presentation}
    test/ fixtures/ (products.ts, categories.ts, orders.ts — mismos UUID que seed.sql), render.tsx
  supabase/
    config.toml
    migrations/ …                   # §7.6
    functions/
      vitrina-create-payment-intent/index.ts
      vitrina-stripe-webhook/index.ts
      _shared/ (cors.ts, stripe.ts, errors.ts)
    seed.sql
    seed-assets/products/*.webp
    scripts/advance-order.sql
  scripts/upload-product-images.ts
  .maestro/
    demo-checkout.yaml
    live-checkout.yaml
  .github/workflows/ (ci.yml, release.yml)
  docs/
    definicion.md                   # este documento
  app.config.ts · eas.json · tsconfig.json · eslint.config.js · .prettierrc · jest.config.js
  tailwind.config.js · global.css · babel.config.js · metro.config.js · .env.example · README.md · CLAUDE.md (solo si hace falta)
```

### 8.3 Repositorios intercambiables y modo demo

Interfaces en `domain/`:

```ts
interface ProductsRepository {
  list(params: ProductQuery): Promise<Page<Product>>;   // q, categoryId, minCents, maxCents, inStock, sort, cursor
  getById(id: string): Promise<Product>;
  getByIds(ids: string[]): Promise<Product[]>;          // para reconcileCart
  listCategories(): Promise<Category[]>;
}
interface CheckoutRepository {
  startCheckout(input: { items: { productId: string; quantity: number }[]; shippingAddress: ShippingAddress }): Promise<CheckoutSession>;
}
interface OrdersRepository {
  list(): Promise<Order[]>;
  getById(id: string): Promise<Order>;
  subscribe(filter: { orderId?: string }, onChange: (order: Order) => void): Unsubscribe;
}
interface AuthRepository { sendCode; verifyCode; signOut; currentUser; onAuthChange }
interface ProfileRepository { ensureMine; get; updateDefaultAddress }
```

- **Inyección:** `RepositoryProvider` (React Context) en `app/_layout.tsx` construye el conjunto según
  `session.mode`: `live`/`guest` → `createLiveRepositories(supabaseClient)`; `demo` → `createMockRepositories(fixtures)`.
  Los hooks de presentación usan `useRepositories()`. Los tests montan el provider con mocks.
- **Mock:** mantiene el estado en memoria (pedidos creados en la sesión demo + 3 pedidos de ejemplo), simula
  latencia (300–600 ms), usa `calculateCartTotals` para crear pedidos y un temporizador para emitir cambios de
  estado por `subscribe`. Las imágenes se resuelven con `expo-asset` (`Asset.fromModule(require(...)).uri`),
  así el dominio sigue viendo `imageUrl: string`. Permite forzar errores (`MockOptions.failNext`) en los tests.
- **Pago:** el PaymentSheet es un hook de React (`useStripe`), así que no puede vivir en `data/`. `use-payment-presenter.ts`
  expone `present(session): Promise<PaymentOutcome>`: en live usa `initPaymentSheet`/`presentPaymentSheet`; en demo
  navega a `/checkout/simulated-payment` y resuelve con la elección del usuario. `StripeProvider` solo se monta en modo live.
- **"Explore demo":** pone `session.mode = 'demo'`, llama a `queryClient.clear()` y vacía el carrito. "Exit demo" deshace lo mismo.

### 8.4 Gestión de estado y errores

| Tipo de estado | Herramienta | Ejemplos |
|---|---|---|
| Datos del servidor | **TanStack Query** | `['products', filters]` (infinite), `['product', id]`, `['categories']`, `['orders']`, `['order', id]`, `['profile']` |
| Estado del cliente persistido | **Zustand + persist (AsyncStorage)** | `cart.store` (items), `theme.store` (preferencia), `session.store` (mode, hasSeenWelcome) |
| Estado efímero de formulario | **React Hook Form + zod** | dirección, email y código OTP |
| Tiempo real | Suscripción del repositorio → `queryClient.setQueryData` | estado del pedido |

- **Storage del carrito: `@react-native-async-storage/async-storage`** vía `createJSONStorage`. Es suficiente para un JSON
  pequeño, tiene mock oficial para Jest y ya lo necesita el cliente de Supabase. MMKV sería más rápido, pero no hace falta.
  El store está versionado (`version: 1` + `migrate`).
- `staleTime`: catálogo 5 min, pedidos 30 s (Realtime los mantiene al día). `retry` desactivado para `validation`, `notFound` y `unauthorized`.
- Errores: cada pantalla distingue `isPending` / `isError` / vacío. `ErrorState` muestra el mensaje según `DomainError.code`
  y un botón "Retry". Un `unauthorized` global cierra la sesión y lleva a sign in. Las mutaciones muestran toasts.

---

## 9. Stack y dependencias principales

| Paquete | Para qué |
|---|---|
| `expo` (SDK estable más reciente), `expo-router` | Runtime y navegación basada en archivos |
| `typescript` (strict) | Tipado |
| `@supabase/supabase-js` | Auth, PostgREST, Realtime, Storage, invocación de funciones |
| `@react-native-async-storage/async-storage` | Sesión de Supabase y persistencia de Zustand |
| `react-native-url-polyfill` | Requerido por supabase-js en RN (si el SDK lo sigue necesitando) |
| `@stripe/stripe-react-native` | PaymentSheet (requiere development build) |
| `@tanstack/react-query` | Datos del servidor, caché, paginación infinita |
| `zustand` | Carrito, tema y sesión (con `persist`) |
| `zod`, `react-hook-form`, `@hookform/resolvers` | Formularios y validación (también de `env`) |
| `nativewind`, `tailwindcss` | Estilos y modo oscuro (`dark:`) |
| `@shopify/flash-list` | Grid del catálogo y listas |
| `expo-image` | Imágenes con caché y placeholder |
| `expo-asset` | Imágenes empaquetadas del modo demo |
| `expo-splash-screen`, `expo-system-ui`, `expo-constants` | Splash, color de fondo en modo oscuro, versión |
| `react-native-safe-area-context`, `react-native-reanimated`, `react-native-gesture-handler` | Base de UI (según la plantilla) |
| `jest-expo`, `jest`, `@testing-library/react-native` | Tests |
| `eslint`, `eslint-config-expo`, `prettier`, `eslint-config-prettier`, `prettier-plugin-tailwindcss` | Lint y formato |
| `eas-cli` (global o `npx`) | Builds |
| Deno + `npm:stripe` (dentro de Edge Functions) | SDK de Stripe en el servidor |
| Supabase CLI, Stripe CLI, Maestro CLI (herramientas locales) | Backend local, webhooks locales, E2E |

---

## 10. Andamiaje inicial desde la CLI

Proyecto **nuevo con la CLI oficial**, sin copiar plantillas de otros repos. La carpeta ya existe como `Vitrina/`
(solo con `docs/`) y el proyecto se crea dentro de ella.

**1. Crear el proyecto**
```bash
cd ~/Developer/MobilePorfolio/Vitrina
npx create-expo-app@latest . --template default
npm run reset-project     # si la plantilla lo incluye: deja app/ vacío sin el código de ejemplo
```
Plantilla **`default`**: según la documentación de Expo, trae Expo Router y TypeScript configurados y es la
pensada para apps multipantalla. `tabs` sería equivalente pero con más código de ejemplo que borrar, y `blank-typescript` obligaría
a instalar Expo Router a mano. Si `create-expo-app` se niega porque el directorio no está vacío (existe `docs/`),
mover `docs/` temporalmente fuera, crear el proyecto y devolverlo.

Luego, en `app.json`/`app.config.ts`: `name: "Vitrina"`, `slug: "vitrina"`, `scheme: "vitrina"`,
`android.package` / `ios.bundleIdentifier`: `com.malpidev.vitrina` (confirmado), `userInterfaceStyle: "automatic"`.

**2. Dependencias**
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill \
  @stripe/stripe-react-native expo-image expo-asset expo-splash-screen expo-system-ui expo-dev-client
npm i @tanstack/react-query zustand zod react-hook-form @hookform/resolvers
npx expo install @shopify/flash-list
```
Plugin de Stripe en `app.config.ts`: `["@stripe/stripe-react-native", { merchantIdentifier: "merchant.com.malpidev.vitrina", enableGooglePay: false }]`.

**3. TypeScript strict**: en `tsconfig.json`, `"strict": true`, `"noUncheckedIndexedAccess": true` y el alias `"@/*": ["./src/*"]`. Script `"typecheck": "tsc --noEmit"`.

**4. NativeWind**: seguir la guía oficial de instalación de NativeWind para la versión compatible con el SDK
(`nativewind`, `tailwindcss`, `tailwind.config.js` con `presets: [require('nativewind/preset')]`, `global.css`,
`babel.config.js` y `metro.config.js` con `withNativeWind`, `nativewind-env.d.ts`). `darkMode` controlado por el `theme.store`.

**5. ESLint + Prettier**
```bash
npx expo lint                          # genera la config base de eslint-config-expo
npm i -D prettier eslint-config-prettier prettier-plugin-tailwindcss
```
Añadir las reglas `no-restricted-imports` de §8.1 y los scripts `"lint": "expo lint"` y `"format": "prettier --write ."`.

**6. Jest**
```bash
npx expo install -D jest-expo jest @types/jest @testing-library/react-native
```
`jest.config.js` con `preset: 'jest-expo'`, el mock de AsyncStorage en `jest.setup.ts` y el script `"test": "jest"`.

**7. Estructura de carpetas**: crear `src/core/*` y `src/features/{auth,catalog,cart,checkout,orders,account}/{domain,data,presentation}` (§8.2), además de `.maestro/` y `scripts/`.

**8. Supabase local**
```bash
supabase init                                   # crea supabase/config.toml
supabase start                                  # Docker; imprime URL y claves locales
supabase migration new vitrina_schema           # y el resto de migraciones de §7.6
supabase functions new vitrina-create-payment-intent
supabase functions new vitrina-stripe-webhook
supabase db reset                               # aplica migraciones + seed.sql
supabase functions serve --env-file supabase/functions/.env
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/vitrina-stripe-webhook
```
En `config.toml`: `[api] schemas` incluye `vitrina`, y `[functions.vitrina-stripe-webhook] verify_jwt = false`.

**9. Development build + EAS** (Stripe **no funciona en Expo Go**: requiere código nativo)
```bash
npm i -g eas-cli && eas login
eas build:configure                              # crea eas.json
eas build --profile development --platform android   # instalar el APK de desarrollo
npx expo start --dev-client
```
Perfiles de `eas.json`: `development` (dev client, internal), `preview` (APK, internal distribution, para demos y
Releases) y `production` (AAB, para el futuro). Para iterar en local también sirve `npx expo run:android`.

> **Nota:** el repositorio git lo inicializa el autor manualmente (este documento no ejecuta `git init` ni otros comandos git).

---

## 11. Identidad visual

**Concepto:** "escaparate de boutique". Cálido, limpio, con el producto como protagonista. Terracota como color de
acción, fondos marfil en claro y carbón cálido en oscuro.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `primary` | `#C4552D` (terracota) | `#E07A52` | CTAs, precio destacado, tab activa |
| `on-primary` | `#FFFFFF` | `#1A1411` | Texto sobre primary |
| `background` | `#FAF7F2` (marfil) | `#14110F` | Fondo de pantalla |
| `surface` | `#FFFFFF` | `#1F1A17` | Tarjetas, hojas |
| `surface-muted` | `#F1ECE4` | `#2A2420` | Chips, skeletons |
| `text` | `#1E1A17` | `#F3EEE8` | Texto principal |
| `text-muted` | `#6B625A` | `#A89E94` | Secundario |
| `border` | `#E4DDD3` | `#3A322C` | Separadores |
| `success` | `#2F7D4F` | `#5CB880` | `paid`, `delivered` |
| `warning` | `#B7791F` | `#E0A94A` | `pending_payment`, stock bajo |
| `info` | `#2B6CB0` | `#6AA3E0` | `shipped` |
| `danger` | `#B42318` | `#F07167` | Errores, `canceled`, sin stock |

Los contrastes texto/fondo se validan en AA (≥ 4.5:1) en ambos modos antes de congelar la paleta.

- **Tipografía:** *DM Serif Display* para títulos y precios grandes (toque de boutique) + *Inter* para UI y cuerpo,
  vía `@expo-google-fonts/*`. Números con `fontVariant: ['tabular-nums']` en los precios.
- **Ícono:** una "V" estilizada formada por el toldo de un escaparate, en marfil sobre fondo terracota; versión
  adaptive-icon de Android con foreground y background separados.
- **Splash:** fondo terracota (`#C4552D`) con el ícono centrado; en modo oscuro, fondo `#14110F` y el ícono en terracota claro.
- **Modo oscuro obligatorio:** `userInterfaceStyle: "automatic"`, preferencia System/Light/Dark en Account, clases
  `dark:` de NativeWind, `expo-system-ui` para el fondo nativo y una barra de estado acorde al tema. Las imágenes de
  producto tienen fondo neutro para verse bien en ambos modos.

---

## 12. Estados de UI y datos de demo

### 12.1 Estados por pantalla

| Pantalla | Carga | Vacío | Error / especiales |
|---|---|---|---|
| Catálogo | Grid de skeletons (6 tarjetas) | "No products match your filters" + "Clear filters" | `ErrorState` + Retry; error de paginación al pie de la lista con reintento |
| Detalle de producto | Skeleton de imagen + texto | — | "Product not available" (`notFound`); sin stock → botón deshabilitado "Out of stock" |
| Carrito | Reconciliación: overlay ligero en los totales | "Your cart is empty" + "Browse products" | Avisos de reconciliación (precio cambiado / cantidad ajustada / producto eliminado); si falla la red, se muestra el carrito con el snapshot y el aviso "Prices will be confirmed at checkout" |
| Checkout | Botón "Pay" con spinner mientras se crea el PaymentIntent | Carrito vacío → redirección al carrito | `outOfStock` (lista de productos + "Update cart"); `paymentCanceled` → banner neutro "Payment canceled — your cart is intact"; `paymentFailed` → banner de error con el motivo + "Try again"; `network` → "Couldn't reach the server" + Retry; total cambiado → confirmación con el nuevo total |
| Pago simulado (demo) | Spinner de 1 s al "pagar" | — | "Simulate failure" → vuelve al checkout con `paymentFailed` ("Card declined (simulated)") |
| Pedidos | Skeleton de lista | "No orders yet" + "Start shopping"; invitado → "Sign in to see your orders" | `ErrorState` + Retry; indicador discreto si Realtime se desconecta ("Live updates paused") |
| Detalle del pedido | Skeleton | — | `pending_payment` recién pagado → "Confirming payment…" con spinner (si pasan >30 s: "Taking longer than usual, pull to refresh"); `canceled` → explicación ("Expired — no charge was made") |
| Sign in / Enter code | Botón con spinner | — | Errores de campo (zod) y de servidor (`invalidCode`, `codeExpired`, rate limit) |
| Account | Skeleton | Sin dirección → "Add a default address" | Error al guardar → toast |

### 12.2 Datos de demo

- **Mock (`src/test/fixtures`, empaquetado en la app):** las mismas 5 categorías y 30 productos del seed (mismos UUID y precios),
  con imágenes locales en `assets/demo-products/`; usuario `Demo Shopper` (`demo@vitrina.app`) con dirección por defecto;
  3 pedidos de ejemplo (uno `delivered` de hace 12 días, uno `shipped` de hace 2 días y uno `canceled`).
- **Seed (`supabase/seed.sql`):** categorías y productos iguales al mock, incluidos productos con stock bajo y sin stock.
  Los usuarios de prueba se crean desde la app (primer código OTP) o con Studio. El seed no crea usuarios en `auth.users`, que es compartido.
- Un test comprueba que los ids y precios de los fixtures coinciden con los de `seed.sql` (parseando el SQL), para que no diverjan.

---

## 13. Estrategia de testing

| Nivel | Qué | Herramientas |
|---|---|---|
| **Unit de dominio** | `calculateCartTotals` (umbral de envío exacto $49.99 / $50.00, carrito vacío, redondeo en centavos), `addToCart` (límites de stock, 10 por línea, 20 líneas), `reconcileCart` (cambio de precio, stock reducido, producto eliminado), `buildOrderTimeline`, `canTransition`, validación zod de `ShippingAddress` | Jest |
| **Repositorios** | `supabase-*`: con un cliente de Supabase simulado, verificar que la consulta se construye bien (filtros, orden, rango), el mapeo snake→camel y `image_paths → imageUrls`, y que los errores de PostgREST y de la función se traducen a `DomainError` (`outOfStock`, `unauthorized`…). `mock-*`: contrato común (la misma suite `describeOrdersRepositoryContract` se ejecuta contra el mock). Paridad fixtures ↔ seed | Jest |
| **Stores** | `cart.store`: persistencia y rehidratación (AsyncStorage mock) y migración de versión | Jest |
| **Componentes clave** | `ProductCard` (precio, "Out of stock"), `CartScreen` (totales, estado vacío, avisos), `CheckoutScreen` (errores `outOfStock` y `paymentCanceled` con el presenter simulado), `OrderTimeline` (paso actual), `DemoBanner` | React Native Testing Library + `RepositoryProvider` con mocks |
| **Base de datos** | Script SQL de verificación (`supabase/tests/`) para correr tras `db reset`: `create_order` ignora los precios del cliente, rechaza sin stock, restaura stock al cancelar; RLS: el usuario A no ve pedidos de B; un transición inválida falla | SQL con `psql` (pgTAP opcional, ver §17) |
| **Edge Functions** | Handler del webhook: firma inválida → 400; evento duplicado → sin efectos | `deno test` con eventos de ejemplo |
| **E2E Maestro** | `demo-checkout.yaml` (**obligatorio, corre en CI si es viable**): Explore demo → buscar "mug" → detalle → Add to cart → Cart → Checkout → Pay (simulated) → ver "Paid" y luego "Shipped" en el detalle. `live-checkout.yaml` (manual/local): sign in con un usuario de prueba (código OTP desde la bandeja local) → agregar producto → checkout → PaymentSheet con `4242 4242 4242 4242`, fecha futura, CVC `123`, ZIP `12345` → "Paid" en vivo. Variante manual con `4000 0000 0000 0002` para verificar el error | Maestro |

Tarjetas de prueba de Stripe usadas: `4242 4242 4242 4242` (éxito), `4000 0000 0000 0002` (rechazo genérico),
`4000 0000 0000 9995` (fondos insuficientes).

---

## 14. CI/CD y entrega

**`.github/workflows/ci.yml`** (en cada PR y push a `main`)
1. `actions/setup-node` con caché de npm → `npm ci`.
2. `npm run lint` (cero warnings: `--max-warnings 0`) · `npm run typecheck` · `npm test -- --ci --coverage`.
3. Job opcional `functions`: `deno lint` + `deno test` sobre `supabase/functions`.

**`.github/workflows/release.yml`** (en cada tag `v*`)
1. `expo/expo-github-action` con `EXPO_TOKEN` (secreto del repo).
2. `eas build --profile preview --platform android --non-interactive --wait` → APK.
3. Descargar el artefacto y publicarlo en **GitHub Releases** del tag (`softprops/action-gh-release`), con notas del changelog.

- Las variables `EXPO_PUBLIC_*` de los builds de EAS se definen como variables de entorno de EAS (entorno `preview`), no en el repo.
- Maestro en CI: se intenta con un emulador Android (`reactivecircus/android-emulator-runner`) solo para `demo-checkout.yaml`.
  Si resulta inestable o lento, se ejecuta localmente y se documenta (ver §17).
- El keep-alive del proyecto Supabase vive en el repo de Agendo; Vitrina no lo duplica.
- Versionado semántico; `v1.0.0` = MVP listo con APK publicado y demo pública.

---

## 15. Variables de entorno

**`.env.example` (cliente, empaquetado en la app: solo valores públicos)**
```dotenv
# URL del proyecto Supabase (local: http://127.0.0.1:54321 · en emulador Android: http://10.0.2.2:54321)
EXPO_PUBLIC_SUPABASE_URL=
# Publishable key de Supabase (sb_publishable_…). Nunca la secret key.
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Publishable key de Stripe en modo test (pk_test_…)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Nombre del comercio que muestra el PaymentSheet
EXPO_PUBLIC_MERCHANT_DISPLAY_NAME=Vitrina
# Si es "true", la app arranca directamente en modo demo (útil para grabar GIFs y para Maestro)
EXPO_PUBLIC_FORCE_DEMO=false
```
`src/core/config/env.ts` valida estas variables con zod al arrancar. Si faltan las de Supabase o Stripe, la app
entra forzosamente en modo demo con un aviso, en vez de fallar.

**`supabase/functions/.env.example` (secretos de Edge Functions; en remoto con `supabase secrets set`)**
```dotenv
# Los secretos de Edge Functions son globales al proyecto compartido → prefijo VITRINA_ obligatorio.
# Clave secreta de Stripe en modo test (sk_test_…). SOLO aquí.
VITRINA_STRIPE_SECRET_KEY=
# Secreto de firma del webhook (whsec_…). Local: lo imprime `stripe listen`; remoto: Dashboard → Webhooks.
VITRINA_STRIPE_WEBHOOK_SECRET=
```
La URL del proyecto y las claves de Supabase (incluida la secret key que usan `attach_payment_intent` y `mark_order_paid`)
las inyecta automáticamente el runtime de Edge Functions; no se declaran a mano.

**Solo local / scripts (no se empaquetan)**
```dotenv
# Cadena de conexión para aplicar migraciones con psql al proyecto remoto
SUPABASE_DB_URL=
# Secret key (sb_secret_…) para scripts/upload-product-images.ts
SUPABASE_SECRET_KEY=
```

`.env`, `supabase/functions/.env` y cualquier `*.local` van en `.gitignore`. **Ninguna clave `sk_`, `whsec_` ni `sb_secret_` lleva el prefijo `EXPO_PUBLIC_`.**

---

## 16. Definición de terminado

Para pasar a ✅ **MVP listo**:
- [ ] F1–F8 cumplen sus criterios de aceptación en Android.
- [ ] Pago real en modo test de extremo a extremo: PaymentSheet → webhook → `paid` en vivo sin refrescar.
- [ ] El importe cobrado en Stripe siempre coincide con el `total_cents` calculado en el servidor.
- [ ] Modo demo completo sin backend (probado en modo avión), incluido el pago simulado y los estados que avanzan solos.
- [ ] Estados de carga, vacío y error en cada pantalla (§12.1), incluidos pago cancelado y pago fallido.
- [ ] Carrito persistente tras matar la app y reconciliado al abrirlo.
- [ ] RLS en todas las tablas con políticas comentadas, y verificado que un usuario no ve pedidos ajenos.
- [ ] Tests unitarios de dominio y repositorios + `demo-checkout.yaml` de Maestro en verde.
- [ ] CI en verde (lint sin warnings, `tsc --noEmit` sin errores, tests).
- [ ] Modo oscuro completo; ícono y splash propios.
- [ ] `.env.example` y `supabase/functions/.env.example` completos; sin secretos en el repo.
- [ ] README completo según la plantilla de `CLAUDE.md` (incluye el esquema de tablas, qué protege cada política y las Edge Functions).

Para pasar a 🚀 **Publicado**: APK de `v1.0.0` en GitHub Releases, GIF de demo (catálogo → pago → "Paid" en vivo),
repo público y tabla de `CLAUDE.md` / `README.md` actualizada.

---

## 17. Riesgos, supuestos y decisiones abiertas

**Riesgos**
| Riesgo | Mitigación |
|---|---|
| Stripe exige development build: más tiempo de compilación y posibles fallos nativos | Generar el dev build el día 1 de la semana 2, antes de escribir el checkout; mantener el modo demo operativo en todo momento. |
| El webhook no llega (URL mal configurada, firma incorrecta, JWT activado) y el pedido se queda en "Confirming payment…" | `verify_jwt = false` solo en esa función; probar primero con `stripe listen`; mensaje "Taking longer than usual" en la UI. |
| Pago tardío sobre un pedido ya expirado o reemplazado | `mark_order_paid` intenta re-reservar stock. Si no hay, el pedido queda registrado para reembolso manual (en modo test no hay dinero real). Documentado en el README. |
| Configuración de Auth compartida entre las 4 apps | Resuelto en `CLAUDE.md`: OTP por email, "Confirm email" activado, plantilla genérica, SMTP por defecto de Supabase. |
| Nombres globales en el proyecto compartido (funciones, buckets, canales, secretos) | Convención de `CLAUDE.md`: prefijo `vitrina-` en funciones y bucket, `vitrina:` en canales, `VITRINA_` en secretos. |
| Maestro en CI con emulador es lento o inestable | Ejecutarlo en local y documentarlo; CI solo con lint + tests si hace falta. |
| NativeWind y la versión del SDK desalineadas | Seguir la guía oficial de NativeWind para el SDK elegido y fijar versiones. |
| Semana 2 compartida con Rutta | El orden de construcción (§18) deja el checkout real para cuando el modo demo ya esté completo. |

**Supuestos**
- La cuenta de Stripe es nueva, en modo test, sin activar pagos reales.
- Existe el proyecto Supabase compartido con el schema `vitrina` expuesto.
- Solo Android en v1.0.0 (sin cuenta de Apple Developer).
- Un solo comercio, una moneda (USD) y envío nacional ficticio.

**Decisiones tomadas en este documento (no venían de `CLAUDE.md`), a revisar**
1. Sin rol admin; los estados posteriores al pago se avanzan con una RPC restringida a la secret key + script SQL.
2. Invitado puede navegar y usar el carrito; la sesión se exige solo en checkout y pedidos.
3. ~~Email + contraseña~~ → **resuelto:** email + código OTP, convención común de las 4 apps (`CLAUDE.md`).
4. Carrito solo local (AsyncStorage) y sin sincronizar; se vacía al entrar o salir del modo demo.
5. Stock con reserva al crear el pedido, expiración perezosa a los 30 min, sin `pg_cron`.
6. Envío fijo de $4.99, gratis desde $50; sin impuestos; solo USD.
7. Prefijo `vitrina-` en Edge Functions y bucket de Storage.
8. Perfil creado desde la app con la RPC `ensure_profile()`, sin trigger sobre `auth.users` (convención común).
9. Los repositorios lanzan `DomainError` (en vez de devolver `Result`) — adoptado como regla 6 del `CLAUDE.md`.
10. Tarjeta como único método de pago (`allow_redirects: 'never'`).

**Decisiones cerradas (2026-09-25)**
- Solo Android en v1.0.0; bundle id `com.malpidev.vitrina` confirmado.
- SMTP por defecto de Supabase (sin dominio propio).

**Decisiones abiertas**
- ¿pgTAP para los tests de BD o scripts SQL simples? Propuesta: scripts SQL simples; pgTAP si sobra tiempo.
- ¿Imágenes propias (generadas o fotografiadas) o de un banco con licencia libre? Hay que verificar la licencia antes de publicar.

---

## 18. Calendario

**Semana asignada: Semana 2 (5–11 oct 2026)**, compartida con Rutta. `v1.0.0` como tarde el **2026-10-11**.

Orden sugerido de construcción (alto nivel, cada bloque deja `main` funcional):
1. **Andamiaje** (§10): proyecto, dependencias, TS strict, NativeWind, lint, Jest, tema claro/oscuro, estructura de carpetas.
   Generar el development build de inmediato para detectar pronto problemas nativos.
2. **Dominio + mock + modo demo**: modelos, casos de uso del carrito y de los pedidos con tests, fixtures, `RepositoryProvider`, Explore demo.
3. **Catálogo y detalle** sobre el mock → luego el backend: migraciones del schema, RLS, seed, Storage e implementación `supabase` del catálogo.
4. **Carrito persistente** (store, reconciliación, totales).
5. **Auth + perfil** (email + código OTP, `ensure_profile`, gates, dirección por defecto).
6. **Checkout**: primero el pago simulado (demo) completo → luego la RPC `create_order`, `vitrina-create-payment-intent`, PaymentSheet y `vitrina-stripe-webhook` probados con `stripe listen`.
7. **Pedidos + Realtime** (lista, detalle, línea de tiempo, suscripciones; script `advance-order.sql`).
8. **Pulido**: estados de UI de §12, ícono y splash, accesibilidad básica, Maestro, CI + release, README y GIF.
