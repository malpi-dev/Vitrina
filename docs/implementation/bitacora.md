# Vitrina — Bitácora de implementación

> Documento vivo. Se actualiza **al empezar** y **al terminar** cada fase (ver `00-guia-general.md` §3 y §5).
> Todo en español; el código, los commits y el README, en inglés.

## Avance

`█████████░░░░░` 9/14 fases terminadas (64 %)

**Fase actual:** Fase 10 · Checkout demo (⏳ sin empezar)
**Última actualización:** 2026-09-30
**Ventana planificada:** semana 2 (5 – 11 oct 2026), compartida con Rutta. `v1.0.0` como tarde el **2026-10-11**.

## Estado por fase

| # | Fase | Rama | Estado | Inicio | Fin | PR |
|---|---|---|---|---|---|---|
| 01 | Andamiaje | `feat/fase-01-andamiaje` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 02 | Core | `feat/fase-02-core` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 03 | Dominio | `feat/fase-03-dominio` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 04 | Backend local | `feat/fase-04-backend-local` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 05 | Modo demo | `feat/fase-05-modo-demo` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 06 | Catálogo | `feat/fase-06-catalogo` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 07 | Carrito | `feat/fase-07-carrito` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 08 | Auth y cuenta | `feat/fase-08-auth-y-cuenta` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 09 | Pedidos | `feat/fase-09-pedidos` | ✅ Terminada | 2026-09-30 | 2026-09-30 | ver historial de `main` |
| 10 | Checkout demo | `feat/fase-10-checkout-demo` | ⏳ Pendiente | — | — | — |
| 11 | Pagos con Stripe | `feat/fase-11-pagos-stripe` | ⏳ Pendiente | — | — | — |
| 12 | Pulido | `feat/fase-12-pulido` | ⏳ Pendiente | — | — | — |
| 13 | E2E y CI | `feat/fase-13-e2e-y-ci` | ⏳ Pendiente | — | — | — |
| 14 | Lanzamiento | `feat/fase-14-lanzamiento` | ⏳ Pendiente | — | — | — |

Estados: ⏳ Pendiente · 🚧 En progreso · ✅ Terminada · ⛔ Bloqueada

## Versiones clave instaladas

> Se completa en la fase 01 y se actualiza si cambia algo.

| Paquete / herramienta | Versión |
|---|---|
| Expo SDK | 57.0.26 |
| React Native | 0.86.3 |
| Expo Router | 57.0.24 |
| NativeWind / Tailwind | 4.2.7 / 3.4.19 |
| @supabase/supabase-js | 2.117.2 |
| @stripe/stripe-react-native | 0.64.0 |
| @tanstack/react-query | 5.104.0 |
| zustand | 5.0.15 |
| zod | 4.6.5 |
| @shopify/flash-list | 2.0.2 |
| Supabase CLI | 2.118.0 (Postgres local 17.6) |
| Stripe CLI | 1.52.0 |
| Deno | no instalado (se necesita en la fase 11) |
| Maestro | 2.10.0 |
| Node | v24.15.0 (CI usa 22) |

## Pendientes del autor (🙋)

> Acciones que solo puede hacer el humano. Se tachan (`~~…~~`) cuando se completan, con la fecha.

| # | Fase | Acción | Estado |
|---|---|---|---|
| — | — | _Ninguna todavía._ | — |

## Registro

> Una entrada por fase terminada (la más reciente arriba). Plantilla:
>
> ### Fase NN · Nombre — AAAA-MM-DD
> - **Hecho:** qué se implementó (breve, en viñetas).
> - **Verificación:** comandos ejecutados y resultado (nº de tests, pgTAP, prueba en emulador…).
> - **PR:** número o "ver historial de `main`".
> - **Decisiones:** qué se decidió y por qué (también va a la tabla de abajo).
> - **Pendientes:** lo que quedó para otra fase (con el número de fase destino) o para el autor.

### Fase 09 · Pedidos — 2026-09-30
- **Hecho:** `order.mapper.ts` + `SupabaseOrdersRepository` (`list`, `getById` con `notFound`, `subscribe` con `postgres_changes`, canales `vitrina:orders:<uid>` / `vitrina:order:<id>`, `setAuth`, sin carreras al desuscribir) registrado en `createLiveRepositories` (se quitó `unavailableOrders`; solo queda el stub de checkout); `fake-supabase` ampliado (canales, `removeChannel`, `realtime.setAuth` con pausa/fallo, `setSessionUser`); hooks `useOrders`, `useOrder`, `useOrdersLive`, `useOrderLive` (+ `use-order-subscription.ts` compartido: actualiza detalle y lista, antepone pedidos nuevos, invalida al volver de `paused`); componentes `OrderStatusBadge`, `OrderRow`, `OrderTimeline`, `LiveIndicator`; pantallas Orders (FlashList, refresco, skeleton, vacío, error, invitado) y detalle (`src/app/orders/[id].tsx`: estado, línea de tiempo, líneas congeladas, dirección, totales, pista de 30 s, `notFound`, error).
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (56 suites, 511 tests); `supabase db reset && supabase test db` (82/82, sin cambios de BD). Emulador `Pixel_10_Pro` con Supabase local y `shopper@vitrina.dev` (OTP por Mailpit): Orders vacío; el pedido creado por SQL aparece solo (INSERT en vivo); detalle en "Confirming payment…" pasa a **Paid** al ejecutar `mark_order_paid` sin tocar nada (F7 CA1); `db:advance` a `shipped` y `delivered` se refleja en ~1 s (F7 CA2; medido por capturas, < 2 s); con `supabase stop` aparece "Live updates paused" y al reiniciar desaparece y la lista se resincroniza; `realtime.subscription` queda con 1 fila (la de la lista) al salir del detalle y con la app parada. F7 CA3 (segundo usuario) cubierto por pgTAP de RLS (no se repitió a mano); F7 CA4 con el mock en tests (fake timers). Emulador limpio (`pm clear`, `adb reverse` eliminado, Metro detenido). Docker: Rutta detenido al empezar y reiniciado al acabar; Vitrina detenido.
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (reintentos de `useOrder`, `await` de `act`).
- **Pendientes:** ninguno para el autor. Sin revisar manualmente: modo oscuro de Orders/detalle (solo tokens; fase 12), `RefreshControl` en detalle y modo demo en emulador (tests).

### Fase 08 · Auth y cuenta — 2026-09-30
- **Hecho:** `SupabaseAuthRepository` y `SupabaseProfileRepository` (+ `profile.mapper.ts`, `ensure_profile`, `getMine` con autocuración) registrados en `createLiveRepositories` (se quitaron los stubs de auth/perfil); `auth.store`, `useAuthBootstrap`, `useSessionMode` (`demo`/`live`/`guest`/`unknown`, el splash espera al estado), `useMyProfile`, handler global de `unauthorized` (`useUnauthorizedHandler`, una sola vez); Sign in con formulario de email (RHF + zod), ruta `(auth)/verify` con `OtpInput` (autoenvío, reenvío con cuenta atrás de 60 s), `safeRedirect`, `useRequireSession`; Orders en invitado con "Sign in to see your orders"; Account completa (cabecera por modo, nombre editable, dirección, selector de tema, sign out, versión, skeleton/error con Sign out); `AddressForm` reutilizable en `checkout/presentation/components` y ruta `account/address`; `fake-supabase` ampliado con `rpc` y `auth`.
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (52 suites, 473 tests). No se tocó la BD (sin pgTAP; `supabase db reset` solo para dejar el entorno limpio). Emulador `Pixel_10_Pro` con Supabase local y OTP por Mailpit: código incorrecto -> "The code is invalid or has expired." (CA2); código correcto -> entra, fila en `vitrina.profiles` (CA4); nombre y dirección guardados en BD y visibles; matar y reabrir la app conserva sesión y tema Dark (F1 CA1, F8 CA1); Sign out con un producto en el carrito -> invitado y badge del carrito intacto (CA3); Orders como invitado -> Sign in (sin "Continue as guest", con cerrar) -> tras el código vuelve a Orders (redirección). Emulador limpio (`pm clear`, `adb reverse` eliminado, Metro detenido). Docker: Rutta detenido al empezar y reiniciado al acabar; Vitrina detenido.
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (OTP refocus, `ensureMine` best effort, `setUser` previo a navegar, mensaje de código inválido).
- **Pendientes:** ninguno para el autor. `useRequireSession` lo usa Checkout en la fase 10. Sin probar en emulador: handler de `unauthorized` (solo tests), modo demo de Account y modo oscuro de address (tests).

### Fase 07 · Carrito — 2026-09-30
- **Hecho:** `cart.store.ts` (Zustand + persist `vitrina-cart`, `version: 1`, `migrate` y `merge` validados con zod, selectores `useCartItems`/`useCartUnitCount`/`useCartTotals`, `clearCart()`); `useDemoActions` vacía el carrito en `enterDemo`/`exitDemo` (no en sign out); "Add to cart" en el detalle con toasts por resultado y `max` del stepper descontando lo que hay en el carrito ("Max in cart"); `use-reconciled-cart` (estados `checking`/`ok`/`offline`, avisos cerrables); `CartLine`, `CartNoticeBanner`; pantalla Cart (lista FlashList, resumen, pista de envío gratis, Checkout, vacío); badge con unidades en la pestaña Cart; `useFocusEffect` añadido al mock de `expo-router`.
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (42 suites, 401 tests). No se tocó la BD (sin pgTAP). **No** se hizo la verificación manual del paso 6 en emulador ni con Supabase local (cubierta por tests de store, hook, pantalla, detalle y badge); Docker y emulador no se tocaron.
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (reconciliación en `queryFn`, `merge`, ruta `/checkout`).
- **Pendientes:** ninguno para el autor. Revisar en emulador (fase 12 o antes de la 14) el paso 6 completo y el modo oscuro de Cart. `/checkout` no existe hasta la fase 10 (el botón navega a ella con un cast).

### Fase 06 · Catálogo — 2026-09-30
- **Hecho:** `product.mapper.ts` + `SupabaseProductsRepository` (filtros, `escapeLike`, orden con desempates, paginación con fila extra, `notFound`, `getByIds` vacío sin petición) registrado en `createLiveRepositories` (se quitó `unavailableProducts`); `scripts/upload-product-images.mjs` + `npm run images:upload`; hooks (`use-catalog-filters`, `use-products`, `use-categories`, `use-product`, `useDebouncedValue`); componentes (`ProductCard`, `CategoryChips`, `SearchBar`, `ProductGridSkeleton`, `ProductGallery`); pantallas Catálogo (FlashList 2 columnas, pull to refresh, pie de error de paginación), Filtros (`src/app/filters.tsx`, modal) y Detalle (`src/app/product/[id].tsx`, "Add to cart" deshabilitado hasta la fase 07); `AppStack` en `_layout` con cabeceras; `AppText` admite `tone="warning"`; utilidades de test `fake-supabase`, `flash-list-mock`, `expo-image-mock`, `expo-router-mock`.
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (38 suites, 372+ tests); `supabase db reset && supabase test db` (82/82, sin cambios de BD). `images:upload` subió 40 imágenes y `curl -I` devuelve 200. Emulador `Pixel_10_Pro`: demo (20 productos, filtros In stock + Price ↓ aplicados con `dismissTo` y contador, detalle con stepper) e invitado contra Supabase local (consulta con `order=created_at.desc,id.asc&limit=21`, imágenes desde Storage); con Supabase detenido aparece "You're offline" + Retry, y Retry funciona al volver a arrancarlo. Emulador limpio (`pm clear`, `adb reverse` eliminado, Metro detenido). Docker: Vitrina detenido y Rutta reiniciado como al empezar.
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (desempates SQL, error de paginación, `dismissTo`, mocks de test).
- **Pendientes:** ninguno para el autor. Sin revisar manualmente: modo oscuro en las pantallas nuevas (usan solo tokens; revisión en fase 12), deslizar la galería y "Load more" en emulador (cubiertos por tests). Fase 07 conecta "Add to cart" (F4 CA2).

### Fase 05 · Modo demo — 2026-09-30
- **Hecho:** `scripts/generate-product-images.mjs` (sharp) → 40 WebP (< 10 KB c/u) en `assets/products/` + `product-images.generated.ts`; fixtures (`demoCategories`, `buildDemoProducts`, `DEMO_USER`, `DEMO_PROFILE`, `buildSampleOrders`) con test de paridad contra `supabase/seed.sql`; `MockStore` (+ `clone`) con las reglas de `create_order`, máquina de estados y ciclo `paid → shipped → delivered`; 5 repos mock (products, checkout, orders, auth, profile) con tests y suite de contrato `src/test/contracts/orders-repository.contract.ts`; `src/core/di` (`RepositoryProvider`, `useRepositories`, `createMockRepositories`, `createLiveRepositories` con stubs "Not available yet"); `session.store` persistido (`vitrina-session`) + `useIsDemo` + `useSessionHydrated`; rutas base (`_layout`, `(auth)/sign-in`, `(tabs)` con 4 pestañas y `testID`, `+not-found`); Sign in con *Explore demo* y *Continue as guest*; `DemoBanner`; pantallas provisionales; kitchen sink borrado; `renderWithProviders` acepta `repositories`/`store`.
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (34 suites, 335 tests). No se tocó la BD (no se ejecutó pgTAP). Emulador `Pixel_10_Pro` (Metro con `EXPO_PUBLIC_FORCE_DEMO=false` y Stripe placeholder vía variables de shell): tras `pm clear` aparece Sign in → Explore demo → Home con 20 productos (primera página) y 4 pestañas → Account con banner → matar y reabrir entra directo a las pestañas en demo → Exit demo vuelve a Sign in. Emulador dejado limpio (datos de la app borrados, `adb reverse` eliminado, Metro detenido).
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (tests de rutas, rutas tipadas, tagline, verificación manual parcial).
- **Pendientes:** ninguno para el autor. Paso 9 puntos 4 (demo forzado) y 5 (modo avión) solo cubiertos por tests unitarios, no manualmente. Fase 07 debe añadir `clearCart()` en `useDemoActions`.

### Fase 04 · Backend local — 2026-09-30
- **Hecho:** `supabase init` + `config.toml` (schema `vitrina` expuesto, confirmación de email, rate limit local, plantilla OTP local); 4 migraciones (`20261005000100…0400`: schema/enum/tablas/índices/grants, RLS con `comment on policy`, triggers + RPCs, publicación Realtime de `orders` + bucket público `vitrina-products`); `src/features/demo/data/fixtures/catalog.json` (5 categorías, 30 productos) y `scripts/generate-seed.mjs` → `supabase/seed.sql`; `supabase/scripts/advance-order.sql`; suite pgTAP `supabase/tests/vitrina.test.sql` (82 asserts, 24 casos); tipos generados `src/core/supabase/database.generated.ts` y cliente `createClient<Database, 'vitrina'>`; scripts `db:seed:generate`, `db:types`, `db:advance`; test Jest de forma del catálogo y paridad con el seed.
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (254 tests, 4 nuevos); `supabase db reset && supabase test db` en verde (82/82). Comprobado por `psql`: 6 tablas con RLS, 30 productos, 5 categorías, bucket público, `orders` en `supabase_realtime`, todas las funciones con `search_path`. API como `anon`: búsqueda `mug` → 3 productos (Ivory, Terracotta, Insulated Travel). OTP local: correo con código de 6 dígitos en Mailpit, `verify` → sesión, `ensure_profile` y `create_order` vía REST (incluido error `outOfStock` con `details` = ids). `npm run db:advance` probado a mano (`paid → shipped → delivered` y rechazo de `delivered → shipped`).
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (puertos locales, `revoke` también a `service_role`, `outOfStock` tras cancelación perezosa, test de desempate, `.env` local).
- **Pendientes:** ninguno para el autor. Fase 06: la consulta de productos debe usar `order by created_at desc, id asc` (`newest`) y `price_cents, created_at desc, id asc` (`price_*`; en `price_desc` el precio va descendente y el resto igual que `price_asc`) para coincidir con `compareProducts`. La subida de imágenes a Storage es de la fase 06. Estado Docker al cerrar: Supabase de Vitrina detenido (`supabase stop`, con backup) y el de Rutta vuelto a arrancar como estaba al empezar (Agendo y Centavo no estaban corriendo).

### Fase 03 · Dominio — 2026-09-30
- **Hecho:** dominio puro de `catalog` (Category, Product, `parseProductFilters`/`toProductSearchParams`/`hasActiveFilters`/`matchesFilters`/`compareProducts`, `ProductsRepository`), `cart` (CartItem, ShippingPolicy, `calculateCartTotals`, `addToCart`/`updateQuantity`/`removeItem`, `reconcileCart`), `checkout` (`shippingAddressSchema`, `validateCheckoutItems`, PaymentOutcome, CheckoutSession, `CheckoutRepository`), `orders` (`canTransition`, Order, `buildOrderTimeline`, `OrdersRepository`), `auth` (AuthUser, esquemas de email/OTP, `AuthRepository`) y `account` (Profile, `fullNameSchema`, `ProfileRepository`).
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (250 tests, 139 nuevos). Cobertura de `src/features/*/domain/`: 100 % de líneas, ramas, funciones y sentencias. Ningún `Date.now()` ni `new Date()` sin argumento en `domain/` (comprobado con grep). La regla ESLint de arquitectura no se tocó.
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (desempates de orden, `lineFull` con stock bajado, orden de avisos, `Page`/tipos).
- **Pendientes:** ninguno para el autor. Fase 04 debe replicar en SQL el orden de `compareProducts` (desempate) y los casos de envío $49.99/$50.00.

### Fase 02 · Core — 2026-09-30
- **Hecho:** `DomainError` (unión discriminada) + `mapSupabaseError` + mensajes por código; `formatMoney`/`isValidCents`; tema (tokens, store persistido `vitrina-theme`, `ThemeGate` con StatusBar y `expo-system-ui`); contraste AA con test; UI base (AppText, Price, Screen, Button, Card, Skeleton, EmptyState, ErrorState, Badge, TextField, QuantityStepper, Toast); cliente Supabase (schema `vitrina`) + `run()`; QueryClient (`createQueryClient`, reintentos solo `network`/`unknown`, handler de `unauthorized`), `queryKeys`, NetInfo/AppState; layout raíz con fuentes y providers; kitchen sink temporal en `src/app/index.tsx`; `renderWithProviders`, mock de Reanimated y `jest.setup-after-env.js`.
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` en verde (111 tests). Kitchen sink revisado en `Pixel_10_Pro` en claro y oscuro (vía selector del tema); se corrigió un bug visual real (texto oscuro sobre botones sólidos).
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (contraste, `createQueryClient`, `onPrimary`).
- **Pendientes:** ninguno para el autor. El kitchen sink se elimina en la fase 05.

### Fase 01 · Andamiaje — 2026-09-30
- **Hecho:** proyecto Expo SDK 57 (plantilla `default`, sin ejemplo), `app.json` (scheme, package, plugin de Stripe), dependencias de runtime y dev, TS strict, NativeWind 4 con tokens claro/oscuro, ESLint con reglas de arquitectura + Prettier, Jest, estructura de carpetas, `env.ts`, `.env.example`/`.env.scripts.example`, CI, development build Android.
- **Verificación:** `lint`, `typecheck`, `format:check`, `test --ci` (1 test) en verde. Regla de arquitectura comprobada (Supabase en `core/ui` y en `domain/` falla) y revertida. Dev build instalado en `Pixel_10_Pro`; fondo medido por captura: #FAF7F2 en claro y #14110F en oscuro, "Vitrina" en `primary`.
- **PR:** ver historial de `main`.
- **Decisiones:** ver tabla (npm cache, AGENTS.md, plantilla).
- **Pendientes:** ninguno para el autor. Deno no está instalado (fase 11).

## Decisiones y desviaciones respecto a la definición

> Las filas "Plan" se tomaron al escribir este plan (2026-09-30) y **ya están resueltas**: aplícalas.
> Añade una fila por cada decisión nueva durante la implementación.

| Fecha | Fase | Decisión / desviación | Motivo |
|---|---|---|---|
| 2026-09-30 | Plan | Las rutas de Expo Router viven en `src/app/` (no en `app/` raíz como dice la definición §5.2 y §8.2). | La plantilla `default` de `create-expo-app` (SDK 57) las crea ahí; Agendo lo confirmó. |
| 2026-09-30 | Plan | La pestaña de pedidos es `src/app/(tabs)/orders.tsx` (archivo) y el detalle `src/app/orders/[id].tsx`. | Evita dos carpetas `orders/` con `index` ambiguo. |
| 2026-09-30 | Plan | Development build desde la fase 01 (`npx expo run:android`), con `@stripe/stripe-react-native` y `expo-dev-client` instalados desde el inicio. No se usa Expo Go. | Stripe requiere código nativo (definición §17: detectar pronto fallos nativos). Así no hay dos entornos distintos. |
| 2026-09-30 | Plan | Los fixtures del modo demo viven en `src/features/demo/data/fixtures/` (no en `src/test/fixtures/`). Los tests los importan de ahí. | Se empaquetan en la app; `src/test/` es solo para utilidades de test. Mismo criterio que Agendo. |
| 2026-09-30 | Plan | Una sola fuente de imágenes: `assets/products/<slug>-<n>.webp`. La usan el modo demo (bundled) y el script de subida a Storage. No existe `supabase/seed-assets/`. | Evita duplicar ~40 imágenes. |
| 2026-09-30 | Plan | Las imágenes de producto iniciales son **ilustraciones generadas** por `scripts/generate-product-images.mjs` (`sharp`, devDependency). El autor puede reemplazarlas por fotos con licencia (decisión abierta de la definición §17). | Desbloquea el desarrollo sin depender de licencias; el script es reproducible. |
| 2026-09-30 | Plan | Scripts de Node en `.mjs` (`scripts/upload-product-images.mjs`), ejecutados con `node --env-file=.env.scripts`. | Evita configurar un runner de TypeScript para scripts. |
| 2026-09-30 | Plan | Tests de BD con **pgTAP** (`supabase test db`). Resuelve la decisión abierta de la definición §17. | Agendo ya lo usa con éxito en la misma CLI. |
| 2026-09-30 | Plan | `CheckoutRepository` añade `reportPaymentResult(orderId, outcome)`: en live es un no-op (solo el webhook marca `paid`); en mock programa `paid → shipped → delivered`. | La hoja de pago simulado necesita avisar al mock sin que la UI toque `data/`. |
| 2026-09-30 | Plan | La máquina de estados permite además `canceled → paid`, **solo** desde `mark_order_paid` (pago tardío con re-reserva de stock, definición §7.3). `canTransition` del dominio refleja la misma tabla. | La definición §6.2 lo prohibía, pero §7.3 lo exige. Los clientes no pueden actualizar `orders` (RLS), así que no abre ningún hueco. |
| 2026-09-30 | Plan | Si el pago tardío no puede re-reservar stock, el pedido queda `canceled` con `needs_refund = true` (columna nueva) y `last_payment_error = 'paid_after_cancel'`. | Concreta "registra el caso para reembolso manual" (§7.3). |
| 2026-09-30 | Plan | `OrdersRepository.subscribe(filter, onChange, onStatus?)` añade `onStatus('live' \| 'paused')`. | Necesario para el indicador "Live updates paused" (§12.1). Patrón de Agendo. |
| 2026-09-30 | Plan | GoTrue devuelve `otp_expired` tanto para código incorrecto como caducado: se mapea a `invalidCode` con el mensaje "The code is invalid or has expired". Se añade el código `rateLimited`. `codeExpired` se conserva en el tipo pero no se produce. | La API no distingue ambos casos (aprendido en Agendo). |
| 2026-09-30 | Plan | `reconcileCart` **elimina** del carrito los productos inactivos o inexistentes y emite un aviso `removed` con su nombre (en vez de "marcarlos para eliminar"). | Menos estados de UI; el usuario ve el aviso igualmente. |
| 2026-09-30 | Plan | La sesión guarda `isDemo` y `hasSeenWelcome` persistidos. Al reabrir la app en demo se crea un `MockStore` nuevo (los pedidos creados en la sesión demo anterior se pierden; los 3 de ejemplo reaparecen). | Quien revisa la app no tiene que pulsar *Explore demo* cada vez; el mock sigue siendo solo memoria. |
| 2026-09-30 | Plan | El nombre del perfil (`profiles.full_name`) es editable en Account. | La definición lo muestra pero no dice cómo se rellena; el OTP no pide nombre. |
| 2026-09-30 | Plan | El contraste AA de la paleta se comprueba con un test automático desde la fase 02 (no en el pulido). Si algún par falla, se ajusta el color y se anota aquí. | `primary` (#C4552D) sobre blanco da ≈ 4,5:1 justo en el límite y `warning` (#B7791F) ≈ 3,6:1 como texto. |
| 2026-09-30 | Plan | Fuente única del catálogo: `src/features/demo/data/fixtures/catalog.json`. `supabase/seed.sql` se **genera** con `scripts/generate-seed.mjs` (no se edita a mano). Un test comprueba la paridad seed ↔ JSON. | Garantiza por construcción que demo y backend tengan los mismos UUID, precios y stock (definición §12.2). |
| 2026-09-30 | Plan | `createLiveRepositories` usa stubs (`src/core/di/unavailable-repositories.ts`, lanzan "Not available yet") que se reemplazan por fase: productos (06), auth/perfil (08), pedidos (09), checkout (11). En la 11 el archivo se borra. | Permite probar el modo invitado/live de forma incremental sin romper tipos. |
| 2026-09-30 | Plan | Hasta tener la clave real de Stripe (fase 11), el `.env` local usa `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder`. | `isBackendConfigured` exige Stripe (definición §15); sin marcador no se podría probar catálogo, auth ni pedidos en live. |
| 2026-09-30 | Plan | El presentador de pago se entrega por contexto (`PaymentPresenterRoot` → proveedor demo o `StripePaymentProvider`), no con un `if` dentro de un hook. | `useStripe()` exige `StripeProvider`, que solo se monta en live; un hook condicional rompería las reglas de hooks. |
| 2026-09-30 | Plan | Canales de Realtime: `vitrina:orders:<uid>` (lista) y `vitrina:order:<orderId>` (detalle). | Convención `<app>:<tema>:<id>` de `CLAUDE.md`; la definición solo nombraba el de la lista. |
| 2026-09-30 | Plan | El webhook registra el evento en `stripe_events` **antes** de procesarlo y, si el procesamiento falla, borra la fila y responde 500 para que Stripe reintente. Eventos sin `metadata.order_id` se ignoran. | Idempotencia sin perder eventos cuando falla la RPC (`mark_order_paid` ya es idempotente). |
| 2026-09-30 | 01 | Se conservan `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`), `.claude/` y `.vscode/` que trae la plantilla, igual que Agendo. Plantilla trajo `@expo/ui`, `expo-glass-effect`, `expo-device`, etc.; se dejan (mismas que Agendo). | Coherencia con Agendo; se podan en el pulido si sobran. |
| 2026-09-30 | 01 | `README.md` provisional mínimo (el de la plantilla de Expo se descartó); `LICENSE` reemplazada por MIT 2026 José Malpica. | La guía pide no dejar la licencia de Expo; README completo en fase 14. |
| 2026-09-30 | 01 | `npm install` se ejecutó con `NPM_CONFIG_CACHE` temporal por un error EACCES en `~/.npm/_cacache`. | Problema local del entorno, no del repo. |
| 2026-09-30 | 01 | `npx expo run:android` se ejecutó con `--no-bundler`; Metro se levantó aparte. `.env` local con `EXPO_PUBLIC_FORCE_DEMO=true`. | Permite iterar sin bloquear la terminal. |
| 2026-09-30 | 02 | Contraste AA: `primary` claro `#C4552D` → `#BB512B` (blanco 4,48 → 4,86:1; sobre marfil `background` 4,20 → 4,54:1) y `warning` claro `#B7791F` → `#A16B1B` (3,64 → 4,53:1 sobre `surface`). Se actualizaron `global.css` y `tokens.ts`. Modo oscuro sin cambios. | El test exige ≥ 4,5 y fallaron; `primary` sobre `background` se añadió como par porque el precio/enlaces van también sobre el fondo. Esto cambia el `primary` de la definición §11 y de la tabla de la fase 12. |
| 2026-09-30 | 02 | `query-client.ts` exporta `createQueryClient()` además del singleton `queryClient`. | Permite probar reintentos y el handler de `unauthorized` con instancias aisladas. |
| 2026-09-30 | 02 | `AppText` admite además `tone="onPrimary"`; `ErrorState` muestra "Retry" solo si hay `onRetry`; el toast usa `toast.store.ts` con `show(message, tone)`. | El texto de `Button` sólido con `text-text` ganaba a `text-on-primary` (visto en emulador); el resto sigue el archivo de fase. |
| 2026-09-30 | 02 | Tipos `Database` de Supabase aún no existen: el cliente no está tipado hasta la fase 04. | Según el archivo de fase. |
| 2026-09-30 | 03 | Desempate de orden: `newest` = `createdAt` desc, luego `id` asc; `price_asc`/`price_desc` = precio, luego `newest`, luego `id` asc. El archivo de fase solo fijaba `newest`. | Orden total y determinista; la consulta SQL de la fase 04 debe usar el mismo `order by` para que mock y backend coincidan (paginación por offset estable). |
| 2026-09-30 | 03 | `parseProductFilters`: `min`/`max` solo aceptan enteros no negativos (`1.5` se ignora); `category` se valida con una regex UUID laxa (sin exigir versión/variante); `toProductSearchParams` convierte centavos a dólares con `Math.round`. | El archivo de fase dice "dólares enteros" y "uuid"; la regex laxa evita rechazar UUID de fixtures no RFC. |
| 2026-09-30 | 03 | `addToCart` con línea existente por encima del límite (p. ej. el stock bajó) devuelve `rejected/lineFull`; `updateQuantity` con id desconocido o cantidad no finita devuelve el mismo array. `reconcileCart` emite `priceChanged` antes de `quantityAdjusted` en una misma línea y trata `stock <= 0` como `outOfStock`. | El archivo de fase no especificaba estos bordes. |
| 2026-09-30 | 03 | `shippingAddressSchema`: `line2`/`phone` vacíos o en blanco pasan a `undefined` mediante `refine` + `transform` (no `z.preprocess`), manteniendo la clave opcional en el tipo inferido. `validateCheckoutItems` lanza `DomainError({ code: 'validation', fields: { items } })`. | Zod 4.6.5; el tipo de `ShippingAddress` queda con `line2?`/`phone?`. |
| 2026-09-30 | 04 | Para liberar los puertos locales (54321–54324) se ejecutó `supabase stop --project-id rutta` (con backup) y, al terminar, se reinició Rutta y se detuvo Vitrina. | Agendo, Centavo y Rutta comparten puertos; la guía §4.3 pide detener solo los otros proyectos. |
| 2026-09-30 | 04 | `supabase start` falla con el schema `vitrina` expuesto si aún no existen las migraciones (PostgREST no carga la caché): se crearon las migraciones antes del primer arranque. `extra_search_path` se dejó en `["public", "extensions"]`, sin `vitrina`. | Orden de trabajo; el cliente siempre usa `.schema('vitrina')`. |
| 2026-09-30 | 04 | El `revoke execute` de la migración 3 incluye también a `service_role`, y luego se concede solo a las funciones indicadas. | El archivo de fase solo revocaba a `public`/`anon`/`authenticated`, pero Supabase concede por defecto a `service_role`; el criterio de terminado pide acceso solo al rol indicado. `postgres` (dueño) conserva acceso. |
| 2026-09-30 | 04 | En pgTAP, "cantidad mayor que el stock" usa 6 (stock 5), no 5: `create_order` cancela primero el pendiente del propio llamante y le devuelve el stock, así que pedir justo el stock reservado es válido. Se añadió un assert del desempate `order by created_at desc, id asc`. | Comportamiento correcto de la regla 5; el desempate documenta la desviación de la fase 03. |
| 2026-09-30 | 04 | Se añadió `src/features/demo/data/__tests__/catalog.test.ts` (forma del catálogo, casos de stock y presencia de ids/precios en `seed.sql`). | Anticipa el test de paridad seed ↔ JSON del plan sin depender de la fase 05. |
| 2026-09-30 | 04 | `.env` local (no commiteado) apunta a `http://10.0.2.2:54321` + publishable key local, con `EXPO_PUBLIC_FORCE_DEMO=true` y Stripe `pk_test_placeholder`. `db:types` genera sin formatear (Prettier e ESLint lo ignoran). | Según el archivo de fase. |
| 2026-09-30 | 05 | Los tests de rutas viven en `src/test/routes/` (no en `src/app/`), y el test de pantallas usa `jest.mock('expo-router')` en vez de `renderRouter`. | Todo archivo en `src/app/` es una ruta de Expo Router; mockear `useRouter` es más simple y estable. |
| 2026-09-30 | 05 | Los tipos de rutas (`.expo/types/router.d.ts`, gitignored) se regeneraron arrancando `expo start`; en CI, sin ese archivo, `tsc` pasa igualmente (comprobado). | `typedRoutes: true` rechazaba `'/sign-in'` con los tipos antiguos. |
| 2026-09-30 | 05 | Tagline de Sign in: "Thoughtful goods for your everyday." (el archivo de fase no fija el texto). `useSessionHydrated` usa `useSyncExternalStore`. `data/` de las features importa `MockStore` de `features/demo/data` (excepción razonable a "data no importa otros features"). El mock de `MockStore` usa un `clone` propio (preserva `Date`) en lugar de `structuredClone`. | Decisiones menores de implementación. |
| 2026-09-30 | 05 | El `.env` local tiene Stripe vacío (no `pk_test_placeholder` como decía la fase 04); para ver Sign in en el emulador se sobrescribieron `EXPO_PUBLIC_FORCE_DEMO=false` y la clave de Stripe por variables de shell al lanzar Metro. `.env` no se modificó. | Evita tocar la configuración local del autor. |
| 2026-09-30 | 06 | La consulta de `price_asc`/`price_desc` ordena por `price_cents`, `created_at desc`, `id` (el archivo de fase solo decía precio + id). | Coincide con `compareProducts` y con la nota de la fase 04; paginación estable. |
| 2026-09-30 | 06 | En el catálogo, `ErrorState` a pantalla completa solo si `isError && !data`: un fallo de `fetchNextPage` también pone `isError`, pero se conservan las páginas y se muestra "Couldn't load more · Retry". | Comportamiento de TanStack Query v5 descubierto con un test. |
| 2026-09-30 | 06 | `router.dismissTo({ pathname: '/', params })` funciona en Expo Router 57 (comprobado en emulador); se envían todas las claves con `undefined` para borrar las vaciadas. En Android el modal se ve como pantalla normal con cabecera. | Según el archivo de fase; sin necesidad de `navigate`. |
| 2026-09-30 | 06 | Mocks de test añadidos en `jest.setup.js`: FlashList (`src/test/flash-list-mock.tsx`, expone `onEndReached`/`onRefresh` como props), `expo-image` y `expo-router` (`src/test/expo-router-mock.ts`, con search params reales). Claves de lista de galería con índice porque en Jest todos los assets resuelven a la misma URI. | FlashList 2.0.2 `jestSetup` roto; `useLocalSearchParams` necesita estado para probar búsqueda y filtros. |
| 2026-09-30 | 06 | `clearFilters` borra todo, incluido `q`. La cantidad máxima usa `MAX_QTY_PER_LINE` de `cart/domain`. `.env.scripts` local (no commiteado) con la secret key local. | Decisión por defecto del archivo de fase; evita duplicar la constante. |
| 2026-09-30 | 07 | La reconciliación se ejecuta dentro del `queryFn` de `useReconciledCart` (aplica `reconcileCart` al carrito actual y guarda los avisos) en vez de un `useEffect` sobre `data`. | La regla `react-hooks/set-state-in-effect` prohíbe `setState` en el efecto; así se ejecuta una vez por respuesta. |
| 2026-09-30 | 07 | El store persistido añade `merge` (además de `migrate`) que valida los datos con zod. | `migrate` solo corre si cambia la versión; datos corruptos con la misma versión entraban tal cual. |
| 2026-09-30 | 07 | El botón Checkout navega con `router.push('/checkout' as never)` hasta que exista la ruta (fase 10). | `typedRoutes` rechaza rutas inexistentes; quitar el cast en la fase 10. |
| 2026-09-30 | 07 | Ante errores distintos de `network` en la reconciliación, el carrito se muestra sin aviso (`status: 'ok'`). | El archivo de fase solo define `offline` para `network`. |
| 2026-09-30 | 08 | `verifyCode` publica el usuario en `auth.store` antes de navegar y `profile.ensureMine()` es "best effort" (si falla, se entra igual y `getMine` crea el perfil luego). | Evita que `useRequireSession` vea `guest` un instante tras `replace` al redirect; la sesión ya es válida. |
| 2026-09-30 | 08 | El mensaje inline de código inválido es el de `getErrorPresentation` ("The code is invalid or has expired."), con punto final. | Coherencia con el resto de errores tipados. |
| 2026-09-30 | 08 | `OtpInput` recupera el foco cuando vuelve a ser editable. | En Android, deshabilitarlo durante la verificación cerraba el teclado y tras un error no se podía reintentar sin tocar (visto en emulador). |
| 2026-09-30 | 08 | `src/app/account/address.tsx` con cabecera propia "Default address" en `AppStack`; `/verify` en `(auth)/verify.tsx`. Los tests de pantallas de auth/cuenta mockean `@/core/config/env` con `isDemoForced: false` (en Jest es `true` por no haber backend configurado). | Sin el mock `useSessionMode` siempre devolvía `demo`. |
| 2026-09-30 | 09 | `useOrder` no define `retry` propio: usa el del `QueryClient` (solo reintenta `network`/`unknown`, así `notFound` no se reintenta). Un `retry` propio pisaba el de los tests y de la app. | El archivo de fase pedía "sin reintentos para `notFound`"; el valor por defecto ya lo cumple. |
| 2026-09-30 | 09 | En RNTL 14 `act` es asíncrono: los tests de hooks usan `await act(...)` y, con fake timers, un `advanceTimersByTimeAsync(1)` extra para vaciar el lote de notificaciones de TanStack Query. | Sin ello los cambios de caché no se veían en pantalla dentro del test. |

## Bloqueos

_Ninguno._

## Ideas para el roadmap (fuera del MVP)

_Se vuelcan en la sección "Roadmap / Future" del README en la fase 14 (además de la definición §3.3)._

## Migraciones aplicadas en remoto

_Ninguna todavía (fase 14). Registrar aquí archivo + fecha al aplicarlas con `psql`._
