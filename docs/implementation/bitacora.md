# Vitrina — Bitácora de implementación

> Documento vivo. Se actualiza **al empezar** y **al terminar** cada fase (ver `00-guia-general.md` §3 y §5).
> Todo en español; el código, los commits y el README, en inglés.

## Avance

`░░░░░░░░░░░░░░` 0/14 fases terminadas (0 %)

**Fase actual:** Fase 01 · Andamiaje (⏳ sin empezar)
**Última actualización:** 2026-09-30
**Ventana planificada:** semana 2 (5 – 11 oct 2026), compartida con Rutta. `v1.0.0` como tarde el **2026-10-11**.

## Estado por fase

| # | Fase | Rama | Estado | Inicio | Fin | PR |
|---|---|---|---|---|---|---|
| 01 | Andamiaje | `feat/fase-01-andamiaje` | ⏳ Pendiente | — | — | — |
| 02 | Core | `feat/fase-02-core` | ⏳ Pendiente | — | — | — |
| 03 | Dominio | `feat/fase-03-dominio` | ⏳ Pendiente | — | — | — |
| 04 | Backend local | `feat/fase-04-backend-local` | ⏳ Pendiente | — | — | — |
| 05 | Modo demo | `feat/fase-05-modo-demo` | ⏳ Pendiente | — | — | — |
| 06 | Catálogo | `feat/fase-06-catalogo` | ⏳ Pendiente | — | — | — |
| 07 | Carrito | `feat/fase-07-carrito` | ⏳ Pendiente | — | — | — |
| 08 | Auth y cuenta | `feat/fase-08-auth-y-cuenta` | ⏳ Pendiente | — | — | — |
| 09 | Pedidos | `feat/fase-09-pedidos` | ⏳ Pendiente | — | — | — |
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
| Expo SDK | — |
| React Native | — |
| Expo Router | — |
| NativeWind / Tailwind | — |
| @supabase/supabase-js | — |
| @stripe/stripe-react-native | — |
| @tanstack/react-query | — |
| zustand | — |
| zod | — |
| @shopify/flash-list | — |
| Supabase CLI | — |
| Stripe CLI | — |
| Deno | — |
| Maestro | — |
| Node | — |

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

_Sin entradas todavía._

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

## Bloqueos

_Ninguno._

## Ideas para el roadmap (fuera del MVP)

_Se vuelcan en la sección "Roadmap / Future" del README en la fase 14 (además de la definición §3.3)._

## Migraciones aplicadas en remoto

_Ninguna todavía (fase 14). Registrar aquí archivo + fecha al aplicarlas con `psql`._
