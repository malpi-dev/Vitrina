# Fase 02 · Core

**Rama:** `feat/fase-02-core`
**Objetivo:** todo lo transversal que usarán las features: errores de dominio tipados, dinero, tema claro/oscuro
persistido con contraste AA verificado por test, fuentes, componentes de UI base, cliente de Supabase, QueryClient y
el layout raíz con providers. Al terminar, una pantalla temporal ("kitchen sink") muestra todos los componentes en
claro y oscuro.
**Referencias:** definición §6.6, §8.4, §11, §12.1 · Agendo: `src/core/errors/*`, `src/core/supabase/{client,run}.ts`,
`src/core/query/*`, `src/core/theme/*`, `src/core/ui/*`, `src/app/_layout.tsx`, `jest.setup*.js`,
`src/test/render-with-providers.tsx`.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Borra `src/core/__tests__/smoke.test.ts` cuando exista el primer test real.

## Paso 1 · Errores de dominio (`src/core/errors/`)

### 1.1 `domain-error.ts`

Unión discriminada por `code` (regla 6 de `CLAUDE.md`) envuelta en una clase para poder hacer `throw`:

```ts
export type DomainErrorInfo =
  | { code: 'network' }
  | { code: 'unauthorized' }
  | { code: 'invalidCode' }
  | { code: 'codeExpired' }            // kept for completeness; GoTrue never distinguishes it (bitácora)
  | { code: 'rateLimited' }
  | { code: 'conflict' }               // e.g. invalid order status transition
  | { code: 'notFound'; entity: 'product' | 'order' | 'profile' }
  | { code: 'validation'; fields?: Record<string, string> }
  | { code: 'outOfStock'; productIds: string[] }
  | { code: 'productUnavailable'; productIds: string[] }
  | { code: 'paymentCanceled' }
  | { code: 'paymentFailed'; reason: string }
  | { code: 'unknown' };

export type DomainErrorCode = DomainErrorInfo['code'];

export class DomainError extends Error {
  readonly info: DomainErrorInfo;
  override readonly cause?: unknown; // only for logs, never shown to the user

  constructor(info: DomainErrorInfo, message?: string, cause?: unknown) {
    super(message ?? info.code);
    this.name = 'DomainError';
    this.info = info;
    this.cause = cause;
  }

  get code(): DomainErrorCode {
    return this.info.code;
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;
export const toDomainError = (e: unknown): DomainError =>
  isDomainError(e) ? e : new DomainError({ code: 'unknown' }, e instanceof Error ? e.message : undefined, e);
```

Para estrechar los datos extra: `if (error.info.code === 'outOfStock') error.info.productIds`.

### 1.2 `map-supabase-error.ts`

`mapSupabaseError(error: unknown, notFoundEntity: 'product' | 'order' | 'profile' = 'product'): DomainError`.
Traduce errores de PostgREST, RPC y GoTrue (referencia: Agendo `map-supabase-error.ts`). Tabla exacta:

| Entrada | Resultado |
|---|---|
| Ya es `DomainError` | se devuelve igual |
| `code === 'P0001'` y `message` ∈ `outOfStock`, `productUnavailable` | ese código con `productIds = JSON.parse(details)` (array de strings; si `details` no parsea → `[]`) |
| `code === 'P0001'` y `message === 'validation'` | `validation` |
| `code === 'P0001'` y `message === 'notFound'` | `notFound` con `notFoundEntity` |
| `code === 'P0001'` y `message === 'unauthorized'` | `unauthorized` |
| `code === 'P0001'` y `message === 'INVALID_TRANSITION'` | `conflict` |
| `code === 'PGRST116'` | `notFound` con `notFoundEntity` |
| `code === 'PGRST301'` o `status === 401` o `name === 'AuthSessionMissingError'` | `unauthorized` |
| `code === '42501'` | `unauthorized` (RLS o `execute` denegado) |
| `code` ∈ `23514`, `22P02`, `23502`, `23505` | `validation` |
| `code === 'otp_expired'` | `invalidCode`, mensaje "The code is invalid or has expired" |
| `code` empieza por `over_` y contiene `rate_limit`, o `status === 429` | `rateLimited` |
| `message` coincide con `/network request failed\|failed to fetch\|fetch failed\|timeout/i` | `network` |
| cualquier otro | `unknown` (conserva `cause`) |

Las RPC de la fase 04 lanzan exactamente esos mensajes (`raise exception using message = 'outOfStock', detail = <json>`).

### 1.3 `error-messages.ts`

`getErrorPresentation(error: unknown): { title: string; message: string }` (en inglés) por código. Mínimo:

| code | title | message |
|---|---|---|
| `network` | "You're offline" | "Couldn't reach the server. Check your connection and try again." |
| `unauthorized` | "Session expired" | "Please sign in again." |
| `invalidCode` | "Invalid code" | "The code is invalid or has expired." |
| `rateLimited` | "Too many attempts" | "Please wait a minute and try again." |
| `notFound` | "Not available" | "This {entity} is no longer available." |
| `validation` | "Check your details" | "Some fields are not valid." |
| `outOfStock` | "Out of stock" | "Some items don't have enough stock." |
| `productUnavailable` | "Unavailable" | "Some items are no longer available." |
| `paymentCanceled` | "Payment canceled" | "Payment canceled — your cart is intact." |
| `paymentFailed` | "Payment failed" | el `reason` |
| `conflict` | "Something changed" | "Please refresh and try again." |
| `unknown` y resto | "Something went wrong" | "Please try again." |

### 1.4 `index.ts` + tests

Barrel que exporta todo. Tests en `src/core/errors/__tests__/`: **un caso por fila** de la tabla 1.2 (incluido el parseo
de `productIds` y un `details` inválido) y un caso por código de 1.3.

## Paso 2 · Dinero (`src/core/utils/money.ts`)

```ts
const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export function formatMoney(cents: number): string { return formatter.format(cents / 100); }
export const isValidCents = (value: number): boolean => Number.isInteger(value) && value >= 0;
```

Tests: `0 → "$0.00"`, `499 → "$4.99"`, `5000 → "$50.00"`, `120000 → "$1,200.00"`; `isValidCents(4.5) === false`.
Este archivo es **puro** (lo puede importar `domain/`).

## Paso 3 · Tema (`src/core/theme/`)

Referencia: Agendo `src/core/theme/*`.

1. `tokens.ts`: `export const colors = { light: { primary: '#C4552D', … }, dark: { … } } as const;` con **los mismos
   valores** que `src/global.css` (definición §11). Tipo `ThemeColors`. Se usa solo donde no llega `className`
   (tab bar, `ActivityIndicator`, `placeholderTextColor`, `StatusBar`, headers de Stack).
2. `theme.store.ts`: Zustand + `persist` (AsyncStorage, `name: 'vitrina-theme'`), `preference: 'system' | 'light' | 'dark'`
   (por defecto `system`), `setPreference`.
3. `use-apply-theme.ts`: aplica la preferencia con `useColorScheme().setColorScheme` de NativeWind y devuelve
   `'light' | 'dark'` efectivo.
4. `use-theme-colors.ts`: devuelve `colors[scheme]`.
5. `theme-gate.tsx`: aplica el tema, pinta `StatusBar` (expo-status-bar) acorde y llama a
   `SystemUI.setBackgroundColorAsync(colors[scheme].background)` (expo-system-ui) cuando cambia el esquema.
6. Tests:
   - `tokens.test.ts`: lee `src/global.css` con `fs` y comprueba que cada variable `--color-*` de `:root` y `.dark:root`
     coincide con el hex de `tokens.ts` convertido a `R G B`.
   - `contrast.test.ts`: calcula el contraste WCAG (luminancia relativa) y exige **≥ 4.5** en ambos modos para:
     `text`/`background`, `text`/`surface`, `text-muted`/`background`, `text-muted`/`surface`, `text-muted`/`surface-muted`,
     `on-primary`/`primary`, `primary`/`surface` (precio como texto), y `success`, `warning`, `info`, `danger` como texto
     sobre `surface`.
   - **Si algún par falla** (es probable con `primary` claro y `warning` claro): ajusta el color mínimo necesario
     (oscurece en claro / aclara en oscuro manteniendo el tono), actualiza **a la vez** `global.css` y `tokens.ts`, y
     anota el cambio en la bitácora (antes → después y ratio). No bajes el umbral del test.

## Paso 4 · UI base (`src/core/ui/`)

Todos con `className` de NativeWind y tokens; ningún hex suelto. Props en inglés; `testID` opcional reenviado.

| Componente | Props clave | Notas |
|---|---|---|
| `AppText` | `variant: 'display' \| 'title' \| 'subtitle' \| 'body' \| 'caption' \| 'label'`, `tone?: 'default' \| 'muted' \| 'primary' \| 'danger' \| 'success'` | `display` usa `font-serif` (DM Serif Display); el resto Inter. `allowFontScaling` por defecto. |
| `Price` | `cents: number`, `size?: 'sm' \| 'md' \| 'lg'`, `strikethrough?: boolean` | `formatMoney`; `style={{ fontVariant: ['tabular-nums'] }}`; `lg` usa `font-serif`. |
| `Screen` | `scroll?: boolean`, `padded?: boolean`, `edges?` | `SafeAreaView` + `bg-background` + `KeyboardAvoidingView` en formularios. |
| `Button` | `title`, `onPress`, `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `loading?`, `disabled?`, `icon?` | Área táctil ≥ 44 pt; `accessibilityRole="button"` y `accessibilityState`. Con `loading` muestra spinner y no dispara `onPress`. |
| `Card` | `children`, `onPress?` | `bg-surface rounded-2xl border border-border`. |
| `Skeleton` | `className` | bloque `bg-surface-muted` con opacidad pulsante (Reanimated o `Animated` de RN). |
| `EmptyState` | `icon` (Ionicons), `title`, `message?`, `actionLabel?`, `onAction?` | |
| `ErrorState` | `error: unknown`, `onRetry?` | Usa `getErrorPresentation`; botón "Retry" con `testID="retry-button"`. |
| `Badge` | `label`, `tone: 'neutral' \| 'primary' \| 'success' \| 'warning' \| 'info' \| 'danger'` | Fondo del tono al 15 % + texto del tono. |
| `TextField` | `label`, `value`, `onChangeText`, `error?`, + props de `TextInput` | Compatible con `Controller` de RHF. `placeholderTextColor` desde tokens. |
| `QuantityStepper` | `value`, `min`, `max`, `onChange`, `testID` | Botones `−`/`+` con `testID` `${testID}-decrement` / `-increment`, deshabilitados en los límites; valor con `${testID}-value`. |
| `Toast` | `toast.store.ts` (Zustand: `show(message, tone)`, `hide()`), `ToastHost` | Auto-cierre a 2,5 s. `showToast(message, tone?)` exportado. |

`index.ts` barrel. Tests (RNTL 14: **`render` y `fireEvent` son asíncronos**, usa `await`; lección de Agendo):
`Button` (loading/disabled no llaman `onPress`), `ErrorState` (mensaje por código + Retry), `Price` (formato),
`QuantityStepper` (límites y deshabilitado).

## Paso 5 · Cliente Supabase (`src/core/supabase/`)

1. `client.ts` (referencia: Agendo `client.ts`): `import 'react-native-url-polyfill/auto'` (si se instaló),
   `createClient(url, key, { db: { schema: 'vitrina' }, auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`.
   Singleton perezoso `getSupabaseClient()` que lanza `Error('Supabase is not configured')` si faltan variables.
   Listener de `AppState` para `startAutoRefresh`/`stopAutoRefresh`. Tipo `VitrinaSupabaseClient = ReturnType<…>`.
   Sin tipos de BD todavía (se tipa en la fase 04).
2. `run.ts`: `run(op)` ejecuta una llamada de supabase-js y convierte **tanto el `error` devuelto como el lanzado**
   en `DomainError` con `mapSupabaseError`. Copia la idea de Agendo `run.ts` (incluido el tipo `Success<R>`) y añade un
   segundo parámetro opcional `notFoundEntity`.
3. Test `run.test.ts`: error devuelto, error lanzado (`TypeError('Network request failed')` → `network`), éxito.

## Paso 6 · Query (`src/core/query/`)

Referencia: Agendo `src/core/query/*`.

- `query-client.ts`: `declare module '@tanstack/react-query' { interface Register { defaultError: DomainError } }`;
  `retry`: máximo 2 reintentos y **solo** para `network` y `unknown`; `staleTime` por defecto 30 s; `QueryCache` y
  `MutationCache` con `onError` que llama a un `unauthorizedHandler` registrable (`setUnauthorizedHandler`).
- `online-manager.ts`: `setupQueryManagers()` conecta `onlineManager` con NetInfo y `focusManager` con `AppState`;
  devuelve la función de limpieza.
- `query-keys.ts`:
  ```ts
  export const queryKeys = {
    products: (filters: unknown) => ['products', filters] as const,
    product: (id: string) => ['product', id] as const,
    productsByIds: (ids: string[]) => ['products-by-ids', [...ids].sort()] as const,
    categories: ['categories'] as const,
    orders: ['orders'] as const,
    order: (id: string) => ['order', id] as const,
    profile: ['profile'] as const,
  };
  ```
- Test `unauthorized.test.ts`: una query que lanza `unauthorized` llama al handler una vez.

## Paso 7 · Layout raíz y kitchen sink

`src/app/_layout.tsx` (provisional; crece en las fases 05, 08 y 11):

- `import '@/global.css';` · `SplashScreen.preventAutoHideAsync()` · `useFonts` con `Inter_400Regular`, `Inter_500Medium`,
  `Inter_600SemiBold`, `Inter_700Bold` y `DMSerifDisplay_400Regular`; ocultar el splash cuando carguen (o fallen).
- Providers: `GestureHandlerRootView` → `SafeAreaProvider` → `QueryClientProvider` → `ThemeGate` → `<Stack screenOptions={{ headerShown: false }} />` + `ToastHost`.
- `useEffect(() => setupQueryManagers(), [])`.

Kitchen sink temporal en `src/app/index.tsx` → pantalla `src/core/ui/__dev__/kitchen-sink.tsx` con: todas las variantes
de `AppText`, `Price` (3 tamaños), `Button` (4 variantes + loading + disabled), `Badge` (6 tonos), `Skeleton`,
`EmptyState`, `ErrorState` (con un `DomainError('network')`), `TextField` con error, `QuantityStepper`, botón que
lanza un toast y un selector System/Light/Dark que usa `theme.store`. Se elimina en la fase 05.

## Paso 8 · Utilidades de test

- `jest.setup.js`: añade el mock de Reanimated si algún componente lo usa (referencia Agendo `jest.setup.js`; el mock
  oficial no funciona con Reanimated 4). Si `Skeleton` usa `Animated` de RN, no hace falta todavía.
- `jest.setup-after-env.js` (en `setupFilesAfterEnv`): `afterEach(() => useToastStore.getState().hide())` — sin esto el
  temporizador del toast deja vivo el worker de Jest (lección de Agendo).
- `src/test/render-with-providers.tsx`: `renderWithProviders(ui, { queryClient? })` con un `QueryClient` nuevo por test
  (`retry: false`, `gcTime: Infinity` en queries **y** mutaciones) + `SafeAreaProvider` con métricas iniciales fijas.
  En la fase 05 se le añade `repositories`.

## Paso 9 · Verificación manual

`npx expo start --dev-client` (no hace falta recompilar: no hay paquetes nativos nuevos). Revisa el kitchen sink en
claro y oscuro (desde el selector y desde el sistema). Si los estilos no cambian, reinicia Metro con `--clear`.
Captura con `adb exec-out screencap -p` si no hay nadie mirando.

## Paso 10 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] `DomainError` como unión discriminada; `mapSupabaseError` con un test por fila; mensajes por código.
- [ ] `formatMoney` con tests; dinero siempre en centavos enteros.
- [ ] Tema System/Light/Dark persistido; `tokens.ts` y `global.css` idénticos (test); contraste AA ≥ 4.5 en todos los pares (test), con los ajustes anotados en la bitácora.
- [ ] Fuentes Inter + DM Serif Display cargadas antes de ocultar el splash.
- [ ] Componentes UI base con tests de `Button`, `ErrorState`, `Price` y `QuantityStepper`.
- [ ] Cliente Supabase (schema `vitrina`) + `run()` con tests; QueryClient con reintentos solo `network`/`unknown` y handler de `unauthorized`.
- [ ] Kitchen sink revisado en claro y oscuro en el emulador.
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
