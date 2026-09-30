# Fase 08 · Auth (email + OTP) y cuenta

**Rama:** `feat/fase-08-auth-y-cuenta`
**Objetivo:** iniciar sesión con email + código de 6 dígitos, crear el perfil con `ensure_profile()`, *gates* que piden
sesión solo para checkout y pedidos (con redirección preservada), cierre de sesión que vuelve a invitado sin tocar el
carrito, y la pestaña Account completa (perfil, dirección por defecto, tema, salir, versión).
**Referencias:** definición F1, F8, §2, §5.1 A y C.2, §7.4, §12.1 (Sign in, Account) · `CLAUDE.md` (Convenciones del
proyecto Supabase: Auth y perfiles) · Agendo: `src/features/auth/**` (repos, `auth-store`, `use-auth-bootstrap`,
`otp-input`, pantallas), `src/app/_layout.tsx` (handler de `unauthorized`), `src/features/settings/presentation/**`.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Supabase local arrancado.

## Paso 1 · Repositorios Supabase de auth y perfil

**`src/features/auth/data/supabase-auth.repository.ts`**
- `sendCode(email)` → `client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`.
- `verifyCode(email, code)` → `client.auth.verifyOtp({ email, token: code, type: 'email' })` → `AuthUser` (`id`, `email`).
- `signOut()` → `client.auth.signOut()`.
- `getCurrentUser()` → `client.auth.getSession()` → usuario de la sesión o `null`.
- `onAuthChange(cb)` → `client.auth.onAuthStateChange((_event, session) => cb(session ? toAuthUser(session.user) : null))`;
  devuelve `() => data.subscription.unsubscribe()`.
- Todo por `run()`/`mapSupabaseError`: `otp_expired` → `invalidCode`; rate limit → `rateLimited` (fase 02).

**`src/features/account/data/supabase-profile.repository.ts`** + `profile.mapper.ts`
- `ensureMine()` → `client.rpc('ensure_profile')` → `Profile`.
- `getMine()` → id del usuario de la sesión (si no hay → `unauthorized`) → `.from('profiles').select('*').eq('id', uid).maybeSingle()`;
  si es `null`, llama a `ensureMine()` (autocuración si el paso post-OTP falló).
- `update(patch)` → `.update({ full_name?, default_address? }).eq('id', uid).select('*').single()`.
- Mapper: `default_address` (jsonb) se valida con `shippingAddressSchema.safeParse`; si no es válido → `null`.

Registra ambos en `createLiveRepositories` (reemplazan los stubs).

Tests con el cliente falso: parámetros de `signInWithOtp`/`verifyOtp`; `otp_expired` → `invalidCode`;
`over_email_send_rate_limit` → `rateLimited`; `getMine` sin fila llama a `ensure_profile`; `update` envía snake_case;
dirección inválida en BD → `null`.

## Paso 2 · Estado de autenticación

- `src/features/auth/presentation/auth.store.ts` (Zustand, **no** persistido; la sesión la persiste supabase-js):
  `status: 'unknown' | 'signedIn' | 'signedOut'`, `user: AuthUser | null`, `setUser(user | null)`.
- `use-auth-bootstrap.ts`: en modo no-demo, `getCurrentUser()` + `onAuthChange` → `setUser`. En demo no hace nada.
- `use-session-mode.ts` (fase 05): ahora devuelve `'demo'` si demo, `'live'` si `status === 'signedIn'`, `'guest'` si
  `signedOut`, y `'unknown'` mientras arranca. El root layout mantiene el splash mientras sea `'unknown'`.
- `use-my-profile.ts`: `useQuery({ queryKey: queryKeys.profile, queryFn: () => profile.getMine(), enabled: mode === 'live' || mode === 'demo' })`.
- En `src/app/_layout.tsx`: `useAuthBootstrap(...)` y registro del **handler global de `unauthorized`** (referencia
  Agendo): toast "Your session expired. Please sign in again." (`warning`) → `auth.signOut()` → `queryClient.clear()`.
  Una sola vez aunque fallen varias consultas a la vez.

## Paso 3 · Sign in y Enter code

**Sign in** (`sign-in-screen.tsx`, fase 05) — añade arriba de los botones existentes:
- Formulario RHF + `zodResolver(emailSchema)`: `TextField` email (`email-input`, `keyboardType="email-address"`,
  `autoCapitalize="none"`, `autoComplete="email"`) y "Continue with email" (`send-code-button`, con `loading`).
- Al enviar: `auth.sendCode(email)` → `router.push({ pathname: '/verify', params: { email, redirect } })`.
- Errores: de campo (zod) bajo el input; de servidor con `getErrorPresentation` (p. ej. `rateLimited`).
- Separador "or" y luego *Explore demo* y *Continue as guest* (fase 05).
- Si la pantalla recibe `redirect` (viene de un *gate*): oculta "Continue as guest" y muestra un botón de cerrar
  (`close-sign-in`) que hace `router.back()` (o `router.replace('/')` si no hay historial).

**Enter code** (`verify-screen.tsx`, ruta `src/app/(auth)/verify.tsx`):
- Texto "We sent a 6-digit code to {email}" + "Change email" (`change-email-button`, vuelve atrás).
- `OtpInput` (`src/features/auth/presentation/components/otp-input.tsx`; referencia Agendo): un `TextInput` oculto
  con 6 casillas visuales, `keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `autoComplete="one-time-code"`,
  `maxLength={6}`, `testID="otp-input"`. Al completar 6 dígitos se envía solo.
- Botón "Verify" (`verify-button`) y "Resend code" (`resend-code-button`) con cuenta atrás de 60 s.
- Éxito: `auth.verifyCode` → `profile.ensureMine()` → `queryClient.setQueryData(queryKeys.profile, profile)` →
  `markWelcomeSeen()` → `router.replace(safeRedirect(redirect) ?? '/')` (F1 CA4).
- `safeRedirect(value)` (`src/features/auth/presentation/safe-redirect.ts`): solo acepta rutas internas que empiezan por
  `/` y no por `//` ni contienen `://`; si no, `null`. Tests con casos maliciosos.
- Error `invalidCode` → mensaje en línea "The code is invalid or has expired" y limpia el input (F1 CA2).

## Paso 4 · Gates

- `src/features/auth/presentation/hooks/use-require-session.ts`: `useRequireSession(currentPath: string)`:
  si el modo es `'guest'` → `router.replace({ pathname: '/sign-in', params: { redirect: currentPath } })` y devuelve
  `false`; en `'live'`/`'demo'` devuelve `true`; en `'unknown'` devuelve `false` sin redirigir. Lo usará Checkout (fase 10).
- La pestaña Orders **no** redirige (definición §12.1): en invitado muestra `EmptyState` "Sign in to see your orders"
  con botón (`orders-sign-in-button`) → `router.push({ pathname: '/sign-in', params: { redirect: '/orders' } })`.
  Implementa esta rama ahora en la pantalla provisional de Orders.

## Paso 5 · Account (`account-screen.tsx`, ruta `(tabs)/account.tsx`)

Secciones (definición F8):

1. **Cabecera**: live → nombre (o "Add your name") + email; demo → "Demo Shopper · demo@vitrina.app" + `DemoBanner`;
   invitado → "You're browsing as a guest" + "Sign in" (`account-sign-in-button`, con `redirect: '/account'`).
2. **Profile** (live y demo): nombre editable con RHF + `fullNameSchema`, "Save" (`save-name-button`) →
   `profile.update({ fullName })` → `setQueryData(profile)` → toast "Saved".
3. **Default address**: resumen en 2–3 líneas o "Add a default address"; botón `edit-address-button` → `/account/address`.
4. **Appearance**: control segmentado System / Light / Dark (`theme-system`, `theme-light`, `theme-dark`) con `theme.store` (F8 CA1).
5. **Session**: live → "Sign out" (`sign-out-button`): `auth.signOut()` → `queryClient.clear()` → toast
   "Signed out" → queda en pestañas como invitado, **el carrito se conserva** (F1 CA3). Demo → "Exit demo" (del banner).
6. **About**: "Version {x}" (`app-version`) con `Constants.expoConfig?.version`.

Estados: skeleton mientras carga el perfil; `ErrorState` con Retry si falla (y botón "Sign out" debajo para no dejar
al usuario atrapado).

**Dirección** (`src/app/account/address.tsx` → `address-screen.tsx`, título "Default address"):
- `AddressForm` reutilizable en `src/features/checkout/presentation/components/address-form.tsx` (lo usará el
  checkout): RHF + `zodResolver(shippingAddressSchema)`, campos con `testID` `address-full-name`, `address-line1`,
  `address-line2`, `address-city`, `address-state`, `address-postal-code`, `address-country` (por defecto `US`),
  `address-phone`. Expone `onSubmit(address)` y `submitLabel`.
- Precargado con la dirección actual; si no hay, `fullName` = nombre del perfil.
- "Save address" (`save-address-button`) → `profile.update({ defaultAddress })` → `setQueryData` → toast → `router.back()`.

## Paso 6 · Tests

- `sign-in-screen`: email inválido muestra error; válido llama a `sendCode` y navega a `/verify` con `email` y `redirect`.
- `verify-screen`: código incorrecto → mensaje; correcto → `ensureMine`, `markWelcomeSeen` y `replace` al `redirect` saneado.
- `safe-redirect`: `'/checkout'` ✓, `'//evil.com'` ✗, `'https://x'` ✗, `undefined` → `null`.
- `use-require-session`: invitado redirige con `redirect`; demo y live no.
- `account-screen`: variantes invitado / demo / live; guardar nombre; sign out deja el carrito intacto.
- `address-form`: campos obligatorios y país normalizado.

## Paso 7 · Verificación manual (Supabase local)

1. `.env` en modo invitado (fase 06). Account → Sign in → `shopper@vitrina.dev` → el código llega a Mailpit
   (`http://127.0.0.1:54324`; también por API: `curl -s http://127.0.0.1:54324/api/v1/messages`).
2. Código incorrecto → "The code is invalid or has expired" (F1 CA2). Código correcto → vuelve a Account con el email.
3. Studio: existe la fila en `vitrina.profiles` (F1 CA4).
4. Guarda nombre y dirección; mata y reabre la app → sigues con sesión, nombre y dirección (F1 CA1).
5. Añade algo al carrito → Sign out → eres invitado y el carrito sigue (F1 CA3).
6. Orders como invitado → "Sign in to see your orders" → tras el código vuelve a Orders.
7. Tema Dark → reinicia → persiste (F8 CA1).

## Paso 8 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] Repos Supabase de auth y perfil con tests, registrados en `createLiveRepositories`.
- [ ] Sign in (email) y Enter code (OTP de 6 dígitos, reenvío con cuenta atrás) con errores tipados legibles.
- [ ] `ensure_profile()` llamado tras verificar; perfil en caché; redirección saneada.
- [ ] `useRequireSession` listo para checkout; Orders en invitado pide iniciar sesión.
- [ ] Handler global de `unauthorized` (toast + sign out, una sola vez).
- [ ] Account completa (perfil, dirección con `AddressForm` reutilizable, tema, sign out/exit demo, versión) con estados de carga y error.
- [ ] F1 CA1–CA4 y F8 CA1 verificados contra Supabase local.
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
