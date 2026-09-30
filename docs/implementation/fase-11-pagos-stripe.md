# Fase 11 · Pagos reales con Stripe (modo test)

**Rama:** `feat/fase-11-pagos-stripe`
**Objetivo:** pago real en modo test de extremo a extremo en local: la app llama a la Edge Function
`vitrina-create-payment-intent` (crea el pedido con precios del servidor + PaymentIntent), presenta el **PaymentSheet**,
Stripe llama al webhook `vitrina-stripe-webhook` (firma verificada, idempotente) que marca el pedido `paid`, y la app lo
ve cambiar **en vivo**. Al terminar no queda ningún repositorio "Not available yet".
**Referencias:** definición F6 completo, §5.1 C, §7.3 (`attach_payment_intent`, `mark_order_paid`, `record_payment_failure`),
§7.5 (Edge Functions), §13 (Edge Functions, tarjetas de prueba), §15 (variables), §17 (riesgos del webhook) ·
`CLAUDE.md` (Edge Functions solo con clave secreta; prefijos `vitrina-` y `VITRINA_`) ·
Agendo: `supabase/functions/agendo-send-reminders/index.ts` (lectura de la secret key, logs sin datos personales).

---

## Paso 0 · Inicio de fase y requisitos

`00-guia-general.md` §3.1. Además:

- **🙋 Acción del autor:**
  1. Cuenta de Stripe en **modo test** (sin activar pagos reales). Copiar la *Publishable key* (`pk_test_…`) y la
     *Secret key* (`sk_test_…`) del Dashboard → Developers → API keys.
  2. `stripe login` en la terminal (Stripe CLI ya instalada, v1.52+).
  3. Pegar las claves: `pk_test_…` en `.env` (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`) y `sk_test_…` en
     `supabase/functions/.env` (`VITRINA_STRIPE_SECRET_KEY`). **Nunca** en el chat ni en archivos versionados.
- Deno para lint/tests de las funciones: `deno --version`; si no está, `brew install deno` y anota la versión en la bitácora.
- Si el autor aún no tiene las claves, puedes avanzar los Pasos 1–4 (código y tests) y dejar el Paso 7 pendiente.

## Paso 1 · Configuración

- `supabase/config.toml`:
  ```toml
  [functions.vitrina-create-payment-intent]
  verify_jwt = true

  [functions.vitrina-stripe-webhook]
  verify_jwt = false          # Stripe calls it without a Supabase JWT; the signature is verified in code
  ```
- `supabase/functions/.env.example` con el contenido de la definición §15 (comentarios en inglés); `supabase/functions/.env`
  ya está en `.gitignore` (fase 01; compruébalo).
- `supabase functions new vitrina-create-payment-intent` y `supabase functions new vitrina-stripe-webhook` (o crea las
  carpetas a mano). Estructura:

```
supabase/functions/
  _shared/
    env.ts          # reads and validates env vars; secret key from SUPABASE_SECRET_KEYS.default, fallback SUPABASE_SERVICE_ROLE_KEY
    stripe.ts       # new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
    supabase.ts     # adminClient() with the secret key; userClient(authHeader) with the publishable/anon key + Authorization
    http.ts         # json(status, body) and errorJson(status, code, extra?)
  vitrina-create-payment-intent/
    index.ts        # Deno.serve(createHandler(realDeps))
    handler.ts      # pure handler with injected deps (testable)
    handler.test.ts
  vitrina-stripe-webhook/
    index.ts
    handler.ts
    handler.test.ts
```

- Importa con especificadores `npm:` fijando versión mayor (p. ej. `npm:stripe@<mayor-actual>`,
  `npm:@supabase/supabase-js@2`), o con un `deno.json` por función si la CLI lo genera. Anota las versiones.
- Nombres de variables del runtime: `SUPABASE_URL` siempre existe; la secret key está en `SUPABASE_SECRET_KEYS`
  (JSON, clave `default`) con `SUPABASE_SERVICE_ROLE_KEY` de respaldo (lección de Agendo); la publishable en
  `SUPABASE_PUBLISHABLE_KEYS` (JSON, `default`) con `SUPABASE_ANON_KEY` de respaldo. Verifica en local listando solo
  los **nombres** (`Object.keys(Deno.env.toObject()).filter((k) => k.startsWith('SUPABASE_'))`), nunca los valores.
- Los logs nunca incluyen emails, direcciones, `clientSecret` ni claves: solo ids (`order_id`, `evt_…`, `pi_…`).

## Paso 2 · `vitrina-create-payment-intent`

`handler.ts`:

```ts
export interface CreatePaymentIntentDeps {
  createOrder(authHeader: string, items: { productId: string; quantity: number }[], address: unknown):
    Promise<{ ok: true; order: { id: string; user_id: string; total_cents: number } } | { ok: false; error: { code?: string; message?: string; details?: string } }>;
  createPaymentIntent(order: { id: string; user_id: string; total_cents: number }): Promise<{ id: string; client_secret: string }>;
  attachPaymentIntent(orderId: string, paymentIntentId: string): Promise<void>;
}
export function createHandler(deps: CreatePaymentIntentDeps): (req: Request) => Promise<Response>
```

Comportamiento:

1. Solo `POST` (si no, 405). Sin cabecera `Authorization` → 401 `{ code: 'unauthorized' }`.
2. Cuerpo JSON `{ items: [{ productId, quantity }], shippingAddress }`; si no es JSON o la forma es inválida → 422
   `{ code: 'validation' }`. Reenvía a la RPC **solo** `productId` y `quantity` de cada línea (descarta cualquier otro campo).
3. `createOrder` = `userClient(authHeader).rpc('create_order', { p_items, p_shipping_address })` (el usuario es
   `auth.uid()` en la RPC; la función **nunca** recibe `user_id` del cliente). Traducción de errores de la RPC:
   - `message` `outOfStock` / `productUnavailable` → **409** `{ code, productIds: JSON.parse(details) }`.
   - `validation` → **422** `{ code: 'validation' }` · `unauthorized`, `PGRST301` o 401 → **401** `{ code: 'unauthorized' }`.
   - otro → **500** `{ code: 'unknown' }` (log con el `code` de Postgres, sin datos personales).
4. `createPaymentIntent` = `stripe.paymentIntents.create({ amount: order.total_cents, currency: 'usd', automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, metadata: { order_id, user_id } }, { idempotencyKey: order.id })`.
   Si Stripe falla → **502** `{ code: 'paymentFailed', reason: 'Payment provider unavailable' }`.
5. `attachPaymentIntent` = `adminClient().schema('vitrina').rpc('attach_payment_intent', …)`; si falla → 500.
6. **200** `{ orderId, clientSecret, totalCents }`.

`handler.test.ts` (`deno test`, deps falsas): 405, 401, 422 (JSON inválido y forma inválida), campos extra descartados
(p. ej. `priceCents` no llega a `createOrder`), 409 con `productIds`, 502 si Stripe lanza, 200 con el cuerpo esperado y
`amount` = `total_cents` del pedido (F6 CA2).

## Paso 3 · `vitrina-stripe-webhook`

`handler.ts`:

```ts
export interface WebhookDeps {
  verify(rawBody: string, signature: string): Promise<{ id: string; type: string; data: { object: { id: string; metadata?: Record<string, string>; last_payment_error?: { message?: string } | null } } }>; // throws if invalid
  recordEvent(id: string, type: string): Promise<'new' | 'duplicate'>;  // insert into vitrina.stripe_events; 23505 -> 'duplicate'
  forgetEvent(id: string): Promise<void>;                                // delete the row so Stripe can retry
  markOrderPaid(paymentIntentId: string): Promise<void>;
  recordPaymentFailure(paymentIntentId: string, message: string): Promise<void>;
}
```

Comportamiento:

1. Solo `POST`. Sin cabecera `stripe-signature` → 400.
2. `rawBody = await req.text()` (**el cuerpo crudo**, sin parsear: la firma se calcula sobre él).
3. `verify` = `stripe.webhooks.constructEventAsync(rawBody, signature, VITRINA_STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider())`;
   si lanza → **400** (firma inválida).
4. Eventos sin `metadata.order_id` (no son de Vitrina) → 200 ignorado, sin registrar.
5. `recordEvent`: si `duplicate` → **200** `{ received: true, duplicate: true }` sin efectos (F6 CA6).
6. Según el tipo:
   - `payment_intent.succeeded` → `markOrderPaid(pi.id)` (RPC `mark_order_paid` con la secret key).
   - `payment_intent.payment_failed` → `recordPaymentFailure(pi.id, pi.last_payment_error?.message ?? 'payment_failed')`.
   - cualquier otro → nada.
7. Si el paso 6 lanza: `forgetEvent(event.id)` y **500** (Stripe reintentará; `mark_order_paid` es idempotente).
8. **200** `{ received: true }`.

`handler.test.ts`: sin firma → 400; firma inválida → 400; evento ajeno (sin `order_id`) → 200 sin registrar; duplicado →
200 sin llamar a `markOrderPaid`; `succeeded` → `markOrderPaid` con el id correcto; `payment_failed` → mensaje; fallo en
`markOrderPaid` → `forgetEvent` + 500; tipo desconocido → 200.

## Paso 4 · Scripts de verificación de funciones

`package.json`:
`"functions:check": "deno check supabase/functions/*/index.ts && deno lint supabase/functions && deno test supabase/functions"`.
Añade `deno fmt --check supabase/functions` si quieres formato (Prettier ya ignora esa carpeta? si no, añádela a
`.prettierignore` para no pelear dos formateadores y anótalo). Debe pasar en limpio.

## Paso 5 · Repositorio Supabase de checkout (cliente)

**`src/features/checkout/data/map-function-error.ts`**: `mapFunctionError(error: unknown): Promise<DomainError>`:
- `FunctionsHttpError` (exportado por supabase-js) → `await error.context.json()` (si falla el parseo → `unknown`) →
  `{ code: 'outOfStock' | 'productUnavailable', productIds }` → ese error; `validation`; `unauthorized` (o `status 401`);
  `paymentFailed` con `reason`; resto → `unknown`.
- `FunctionsFetchError` → `network`. `FunctionsRelayError` → `unknown`. Ya `DomainError` → igual.

**`src/features/checkout/data/supabase-checkout.repository.ts`**:
- `startCheckout(input)` → `client.functions.invoke('vitrina-create-payment-intent', { body: { items, shippingAddress } })`
  (supabase-js añade el JWT del usuario). Error → `throw await mapFunctionError(error)`. Valida la respuesta con zod
  (`orderId` uuid, `clientSecret` string, `totalCents` entero ≥ 0); si no valida → `unknown`.
- `reportPaymentResult()` → **no-op** (solo el webhook marca `paid`; comentario explicándolo).

Regístralo en `createLiveRepositories` y **borra `src/core/di/unavailable-repositories.ts`**.

Tests: cuerpo enviado; respuesta válida; 409 `outOfStock` con ids; 401; fallo de red; respuesta malformada.

## Paso 6 · PaymentSheet (`src/features/checkout/presentation/payment/`)

- `stripe-payment-provider.tsx` (reemplaza el marcador de la fase 10):
  - Envuelve a sus hijos en `<StripeProvider publishableKey={env.stripePublishableKey} urlScheme="vitrina" merchantIdentifier="merchant.com.malpidev.vitrina">`.
  - Un componente interno usa `useStripe()` y provee el `PaymentPresenter` por contexto:
    ```text
    present(session):
      if !session.clientSecret -> failed('Missing payment details')
      { error } = await initPaymentSheet({
          merchantDisplayName: env.merchantDisplayName,
          paymentIntentClientSecret: session.clientSecret,
          returnURL: 'vitrina://stripe-redirect',
          style: 'automatic',                              // follows light/dark
          appearance: { colors: { primary: <token primary> } },
        })
      if error -> failed(mapStripeError(error))
      { error } = await presentPaymentSheet()
      if !error -> succeeded
      if error.code === 'Canceled' -> canceled             // user closed the sheet (also after a declined card)
      else -> failed(mapStripeError(error))
    ```
- `map-stripe-error.ts`: `mapStripeError(error): string` → `error.localizedMessage ?? error.message ?? 'Payment failed'`.
- `PaymentPresenterRoot` (fase 10) monta `StripePaymentProvider` en modo live **solo si** hay `stripePublishableKey`
  (siempre la hay en live, por `isBackendConfigured`).
- Jest: `jest.mock('@stripe/stripe-react-native', () => require('@stripe/stripe-react-native/jest/mock'))` en
  `jest.setup.js` si ese archivo existe en la versión instalada; si no, un mock manual con `StripeProvider` que renderiza
  hijos y `useStripe` con `initPaymentSheet`/`presentPaymentSheet` como `jest.fn`.
- Tests del proveedor: éxito, `Canceled`, error de `init`, error de `present`, sin `clientSecret`.

## Paso 7 · Prueba de extremo a extremo en local

Tres terminales:

```bash
# 1. Functions (reads supabase/functions/.env)
supabase functions serve --env-file supabase/functions/.env
# 2. Stripe -> local webhook. Prints "Ready! Your webhook signing secret is whsec_…"
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/vitrina-stripe-webhook
# 3. App (dev client; Stripe ya está en el build de la fase 01)
npx expo start --dev-client --clear
```

- Copia el `whsec_…` a `supabase/functions/.env` (`VITRINA_STRIPE_WEBHOOK_SECRET`) y **reinicia** la terminal 1.
- `.env` de la app: Supabase local, `pk_test_…` real, `EXPO_PUBLIC_FORCE_DEMO=false`. Metro con `--clear`.
- Si `verify_jwt = true` rechaza JWT válidos en local (p. ej. por el cambio a claves asimétricas de Supabase), pon
  `verify_jwt = false` en esa función: la seguridad no cambia porque la RPC exige `auth.uid()`. Anótalo en la bitácora.

Casos (definición F6; anota cada resultado en la bitácora):

| # | Pasos | Esperado |
|---|---|---|
| CA1 | Usuario live → 2 productos → Checkout → Pay → tarjeta `4242 4242 4242 4242`, fecha futura, CVC `123`, ZIP `12345` | PaymentSheet se completa, carrito vacío, detalle "Confirming payment…" → **Paid** en vivo |
| CA2 | `stripe payment_intents retrieve <pi_…>` (o Dashboard) | `amount` = `orders.total_cents` del pedido |
| CA3 | Pay → cerrar el PaymentSheet | "Payment canceled — your cart is intact"; carrito igual; pedido `pending_payment` |
| CA4 | Pay → `4000 0000 0000 0002` | El sheet muestra el rechazo y permite reintentar; al salir → cancelado; pedido sigue `pending_payment` y `last_payment_error` relleno (evento `payment_failed`) |
| CA5 | En Studio pon a 0 el stock de un producto del carrito → Pay | Banner con ese producto + "Update cart"; al volver al carrito, se reconcilia |
| CA6 | `stripe events resend <evt_…>` de un `payment_intent.succeeded` | 200 `duplicate`; `stripe_events` sin fila nueva; `paid_at` no cambia |
| Extra | Pagar, cerrar la app antes del webhook y reabrir | El pedido aparece `paid` |
| Extra | `4000 0000 0000 9995` (fondos insuficientes) | Igual que CA4 con otro mensaje |

- Revisa los logs de la terminal 1: sin datos personales ni secretos.
- Demo sigue funcionando igual (Explore demo → pago simulado).

## Paso 8 · Cierre

`00-guia-general.md` §3.3, incluyendo `supabase db reset && supabase test db` y `npm run functions:check`.

---

## Criterios de terminado

- [ ] Dos Edge Functions con prefijo `vitrina-`, handlers puros con `deno test` en verde y `functions:check` limpio.
- [ ] La clave `sk_test_` y el `whsec_` solo existen en `supabase/functions/.env` (ignorado); ninguna clave secreta en el cliente ni en git (`git grep -nE "sk_test_|whsec_|sb_secret_"` sin resultados reales).
- [ ] `SupabaseCheckoutRepository` + `mapFunctionError` con tests; `unavailable-repositories.ts` eliminado.
- [ ] PaymentSheet con `StripeProvider` solo en live; resultados `succeeded` / `canceled` / `failed` mapeados.
- [ ] F6 CA1–CA6 verificados en local con `stripe listen` (tabla del Paso 7 en la bitácora).
- [ ] lint/typecheck/format/test + pgTAP + `functions:check` en verde; PR mergeado; bitácora actualizada.
