# Fase 01 · Andamiaje

**Rama:** `feat/fase-01-andamiaje`
**Objetivo:** proyecto Expo creado con la CLI oficial, con TypeScript strict, NativeWind y los tokens de color de
Vitrina, ESLint + Prettier con reglas de arquitectura, Jest, estructura de carpetas, `.env.example`, CI en verde y
un **development build** instalado en el emulador Android (incluye Stripe, aunque todavía no se use).
**Referencias:** definición §8.1, §8.2, §9, §10, §11, §14, §15 · `CLAUDE.md` (Stack, Seguridad) ·
Agendo: `package.json`, `tsconfig.json`, `eslint.config.js`, `jest.config.js`, `tailwind.config.js`,
`babel.config.js`, `metro.config.js`, `src/global.css`, `.github/workflows/ci.yml`.
**Requisitos previos:** Node ≥ 22, npm, `gh` autenticado, Android SDK + emulador (`adb devices` lo lista), Java 17.

> Esta fase no contiene lógica de negocio. Al terminarla, la app abre (development build) una pantalla con el
> texto "Vitrina" en color `primary` sobre `bg-background`, que cambia con el modo oscuro del sistema.

---

## Paso 0 · Inicio de fase

Sigue `00-guia-general.md` §3.1. Además:

- El repo ya existe (`origin = git@github.com:malpi-dev/Vitrina.git`, rama `main` con solo `docs/`).
- Hay cambios sin commitear en `docs/` (definición + este plan). Commitéalos como primer commit de la rama:
  `git add docs && git commit -m "docs: add product definition and implementation plan"`.
- En `../CLAUDE.md` y `../README.md` (carpeta del portafolio, **no** es un repo) cambia el estado de Vitrina a
  `🚧 En progreso`. Esos archivos no se commitean (no pertenecen a este repo).

## Paso 1 · Crear el proyecto Expo

`create-expo-app` no funciona bien sobre una carpeta que ya tiene `.git` y `docs/`. Genera en una carpeta temporal
hermana y copia:

```bash
cd ..                                            # carpeta MobilePorfolio
npx create-expo-app@latest vitrina-scaffold --template default --no-install
rm -rf vitrina-scaffold/.git                     # por si la CLI creó un repo
cd Vitrina
rsync -a --exclude node_modules --exclude .git ../vitrina-scaffold/ ./
rm -rf ../vitrina-scaffold
npm install
npm run reset-project                            # elige la opción que NO conserva el ejemplo
rm -rf app-example
```

- Después borra `scripts/reset-project.js` y la entrada `"reset-project"` de `package.json`.
- La plantilla de SDK 57 pone las rutas en `src/app/` (decisión "Plan" de la bitácora). Verifica que `src/app/` solo
  contiene `_layout.tsx` e `index.tsx`. Si tu versión las pone en `app/` raíz, muévelas a `src/app/` y anótalo.
- Si la plantilla creó carpetas de ejemplo (`src/components`, `src/hooks`, `src/constants`…) que ya no se usan
  tras `reset-project`, bórralas.
- Conserva por ahora los assets de ícono/splash de la plantilla (se reemplazan en la fase 12).
- Comprueba que `LICENSE` (si existe) no es la de la plantilla de Expo; si lo es, reemplázala por MIT 2026 José Malpica.

## Paso 2 · Configurar `app.json`

Edita (conserva lo que trae la plantilla, como los plugins `expo-router` y `expo-splash-screen`):

```jsonc
{
  "expo": {
    "name": "Vitrina",
    "slug": "vitrina",
    "scheme": "vitrina",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "ios": { "bundleIdentifier": "com.malpidev.vitrina", "supportsTablet": false },
    "android": { "package": "com.malpidev.vitrina" /* + adaptiveIcon/edgeToEdge que traiga la plantilla */ },
    "plugins": [
      "expo-router",
      /* expo-splash-screen tal como lo trae la plantilla */
      ["@stripe/stripe-react-native", { "merchantIdentifier": "merchant.com.malpidev.vitrina", "enableGooglePay": false }]
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

- `web`: deja solo lo mínimo que exija la plantilla (web no se soporta).
- El plugin de Stripe se añade **después** de instalar el paquete (Paso 3).

## Paso 3 · Dependencias de runtime

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill \
  @stripe/stripe-react-native expo-dev-client \
  @tanstack/react-query zustand zod react-hook-form @hookform/resolvers \
  @shopify/flash-list expo-image expo-asset expo-constants expo-linking expo-splash-screen expo-system-ui \
  expo-font @expo-google-fonts/inter @expo-google-fonts/dm-serif-display \
  @react-native-community/netinfo @expo/vector-icons
```

- `react-native-url-polyfill`: Agendo confirmó que supabase-js 2.117 aún lo necesita. Si tu versión ya no lo exige
  (revisa `node_modules/@supabase/supabase-js`), anótalo; si no estás seguro, déjalo.
- `@react-native-community/netinfo` alimenta el `onlineManager` de TanStack Query (fase 02).
- `@expo/vector-icons` para los íconos de las pestañas (Ionicons).

## Paso 4 · TypeScript strict

`tsconfig.json` (conserva el `extends` de Expo):

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "types": ["jest", "node"],
    "paths": { "@/*": ["./src/*"], "@/assets/*": ["./assets/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts", "nativewind-env.d.ts"],
  "exclude": ["node_modules", "supabase/functions"]
}
```

- La plantilla suele traer `"@/*": ["./*"]`: cámbialo a `./src/*` y corrige los imports que rompa.
- `supabase/functions` es Deno: se excluye de `tsc` (se valida con `deno check` en la fase 11).
- Script: `"typecheck": "tsc --noEmit"`.

## Paso 5 · NativeWind con los tokens de Vitrina

Sigue la **guía oficial de NativeWind para Expo de la versión estable vigente**. Agendo funciona con NativeWind 4.2 +
Tailwind 3.4 en SDK 57: si la guía coincide, usa sus archivos como referencia (`../Agendo/tailwind.config.js`,
`babel.config.js`, `metro.config.js`, `src/global.css`, `nativewind-env.d.ts`).

Resultado esperado:

- `tailwindcss` y `prettier-plugin-tailwindcss` como devDependencies (`npx expo install --dev …`).
- `src/global.css` con las directivas de Tailwind + tokens, importado en `src/app/_layout.tsx` (`import '@/global.css';`).
- `tailwind.config.js` con `content: ['./src/**/*.{ts,tsx}']`, `presets: [require('nativewind/preset')]`,
  `darkMode: 'class'` (o el mecanismo de la versión instalada).
- `babel.config.js` y `metro.config.js` (`withNativeWind(config, { input: './src/global.css' })`) según la guía.
- `nativewind-env.d.ts` con la referencia de tipos **y** `declare module '*.css';` (sin esto `tsc` falla; Agendo).

**Tokens de color** (definición §11) como variables CSS en `src/global.css`, después de las directivas:

```css
:root {
  --color-primary: 196 85 45;          /* #C4552D terracotta */
  --color-on-primary: 255 255 255;     /* #FFFFFF */
  --color-background: 250 247 242;     /* #FAF7F2 ivory */
  --color-surface: 255 255 255;        /* #FFFFFF */
  --color-surface-muted: 241 236 228;  /* #F1ECE4 */
  --color-text: 30 26 23;              /* #1E1A17 */
  --color-text-muted: 107 98 90;       /* #6B625A */
  --color-border: 228 221 211;         /* #E4DDD3 */
  --color-success: 47 125 79;          /* #2F7D4F */
  --color-warning: 183 121 31;         /* #B7791F */
  --color-info: 43 108 176;            /* #2B6CB0 */
  --color-danger: 180 35 24;           /* #B42318 */
}
.dark:root {
  --color-primary: 224 122 82;         /* #E07A52 */
  --color-on-primary: 26 20 17;        /* #1A1411 */
  --color-background: 20 17 15;        /* #14110F */
  --color-surface: 31 26 23;           /* #1F1A17 */
  --color-surface-muted: 42 36 32;     /* #2A2420 */
  --color-text: 243 238 232;           /* #F3EEE8 */
  --color-text-muted: 168 158 148;     /* #A89E94 */
  --color-border: 58 50 44;            /* #3A322C */
  --color-success: 92 184 128;         /* #5CB880 */
  --color-warning: 224 169 74;         /* #E0A94A */
  --color-info: 106 163 224;           /* #6AA3E0 */
  --color-danger: 240 113 103;         /* #F07167 */
}
```

En `tailwind.config.js` → `theme.extend.colors`: `primary: 'rgb(var(--color-primary) / <alpha-value>)'` y lo mismo
para `on-primary`, `background`, `surface`, `surface-muted`, `text`, `text-muted`, `border`, `success`, `warning`,
`info`, `danger`. Si la versión instalada usa otra sintaxis (p. ej. Tailwind v4 con `@theme`), adapta según su guía
y anótalo. Lo importante: clases semánticas (`bg-surface`, `text-text-muted`…) que cambian solas con el modo oscuro.

Fuentes en `theme.extend.fontFamily` (se cargan en la fase 02):
`sans: ['Inter_400Regular']`, `medium: ['Inter_500Medium']`, `semibold: ['Inter_600SemiBold']`,
`bold: ['Inter_700Bold']`, `serif: ['DMSerifDisplay_400Regular']`.

Prueba: `src/app/index.tsx` muestra `<Text className="text-3xl text-primary">Vitrina</Text>` dentro de una `View`
`flex-1 items-center justify-center bg-background`.

## Paso 6 · ESLint + Prettier

```bash
npx expo lint                                   # genera eslint.config.js (flat config) con eslint-config-expo
npx expo install --dev prettier eslint-config-prettier eslint-import-resolver-typescript
```

`.prettierrc`:

```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }
```

`.prettierignore`: `node_modules`, `.expo`, `android`, `ios`, `dist`, `coverage`, `docs`, `supabase/.temp`,
`supabase/templates`, `*.generated.ts`, `assets`.
(`docs` se excluye para que Prettier no reformatee las tablas de estos documentos; lección de Agendo.)

`eslint.config.js` (flat config). Estructura, basada en `../Agendo/eslint.config.js`:

1. `expoConfig`.
2. `settings: { 'import/resolver': { typescript: { project: './tsconfig.json' }, node: true } }` (sin esto
   `expo lint` falla con `import/no-unresolved` para `@/`; lección de Agendo).
3. `ignores: ['src/core/supabase/database.generated.ts', 'dist/*', 'supabase/functions/**', '.expo/**', 'android/**', 'ios/**', 'coverage/**']`.
4. **Reglas de arquitectura** (definición §8.1):

```js
// Everywhere in src/: only core/supabase and features/*/data may talk to Supabase; only the payment folder to Stripe.
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/core/supabase/**', 'src/features/*/data/**', 'src/test/**', 'src/features/checkout/presentation/payment/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['@supabase/*'], message: 'Only src/core/supabase and features/*/data may import Supabase.' },
        { group: ['@stripe/*'], message: 'Only features/checkout/presentation/payment may import Stripe.' },
      ],
    }],
  },
},
// data/ can talk to Supabase but never to Stripe (the PaymentSheet is a React hook).
{
  files: ['src/features/*/data/**/*.{ts,tsx}', 'src/core/supabase/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{ group: ['@stripe/*'], message: 'Stripe is only used from features/checkout/presentation/payment.' }],
    }],
  },
},
// domain/ is pure.
{
  files: ['src/features/*/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/data/**', '**/presentation/**'], message: 'domain must not import data or presentation.' },
        { group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'], message: 'domain must be framework-free.' },
        { group: ['@supabase/*', '@stripe/*', '@tanstack/*', 'zustand', 'zustand/*', 'nativewind'], message: 'domain must not depend on backend/state/UI libraries.' },
        { group: ['@/core/*', '!@/core/errors', '!@/core/errors/*', '!@/core/utils/money'], message: 'domain may only import @/core/errors and @/core/utils/money from core.' },
      ],
    }],
  },
},
```

   Nota: en flat config, si dos bloques definen `no-restricted-imports` para el mismo archivo, **gana el último**.
   Por eso el bloque de `domain/` va al final e incluye también Supabase y Stripe.
5. `eslintConfigPrettier` al final.

Scripts: `"lint": "expo lint --max-warnings 0"`, `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.
Ejecuta `npm run format` una vez y deja el lint limpio.

## Paso 7 · Jest

```bash
npx expo install --dev jest jest-expo @types/jest @testing-library/react-native
```

`jest.config.js` (referencia: `../Agendo/jest.config.js`):

```js
module.exports = {
  preset: 'jest-expo',
  globalSetup: './jest.global-setup.js',
  testMatch: ['**/*.test.[jt]s?(x)'],
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: { '^@/assets/(.*)$': '<rootDir>/assets/$1', '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/supabase/', '/.maestro/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|@stripe/stripe-react-native|nativewind|react-native-css-interop)',
  ],
};
```

- `jest.global-setup.js`: `module.exports = async () => { process.env.TZ = 'UTC'; };`
- `jest.setup.js`: mock oficial de AsyncStorage
  (`jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));`).
  Los mocks de FlashList, Reanimated y Stripe se añaden cuando se necesiten (fases 02, 05 y 11).
- Scripts: `"test": "jest"`, `"test:watch": "jest --watch"`.
- Test de humo `src/core/__tests__/smoke.test.ts` (`expect(1 + 1).toBe(2)`); se borra en la fase 02.

## Paso 8 · Estructura de carpetas

Crea (con `.gitkeep` en las vacías):

```
src/core/{config,supabase,di,session,theme,errors,query,ui,utils}
src/features/{auth,catalog,checkout,orders,account}/{domain,data,presentation}
src/features/cart/{domain,presentation}
src/features/demo/{data,presentation}
src/test/
assets/products/
scripts/
.maestro/
.github/workflows/
```

## Paso 9 · Variables de entorno

- `.env.example` con el contenido de la definición §15 (comentarios en inglés). Incluye todas:
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `EXPO_PUBLIC_MERCHANT_DISPLAY_NAME=Vitrina`, `EXPO_PUBLIC_FORCE_DEMO=false`.
- `.env.scripts.example` (solo scripts locales, fase 06/14): `SUPABASE_URL=`, `SUPABASE_SECRET_KEY=`, `SUPABASE_DB_URL=`,
  con comentarios. **Nunca** con prefijo `EXPO_PUBLIC_`.
- `.gitignore`: añade `.env`, `.env.local`, `.env.*.local`, `.env.scripts`, `supabase/functions/.env`, `supabase/.temp`,
  `supabase/.branches`, `coverage/`, `*.apk`, `*.aab`. Verifica con `git check-ignore -v .env.example` que los
  `.example` **no** quedan ignorados.
- `src/core/config/env.ts`:

  ```ts
  import { z } from 'zod';

  const schema = z.object({
    EXPO_PUBLIC_SUPABASE_URL: z.url().optional(),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
    EXPO_PUBLIC_MERCHANT_DISPLAY_NAME: z.string().min(1).default('Vitrina'),
    EXPO_PUBLIC_FORCE_DEMO: z.enum(['true', 'false']).default('false'),
  });

  // Expo only inlines EXPO_PUBLIC_* when accessed statically, so list them explicitly.
  const parsed = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined,
    EXPO_PUBLIC_MERCHANT_DISPLAY_NAME: process.env.EXPO_PUBLIC_MERCHANT_DISPLAY_NAME || undefined,
    EXPO_PUBLIC_FORCE_DEMO: process.env.EXPO_PUBLIC_FORCE_DEMO || undefined,
  });

  const data = parsed.success ? parsed.data : null;

  export const env = {
    supabaseUrl: data?.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: data?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    stripePublishableKey: data?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    merchantDisplayName: data?.EXPO_PUBLIC_MERCHANT_DISPLAY_NAME ?? 'Vitrina',
  };

  /** Live mode needs Supabase AND Stripe (checkout). Without them the app runs demo-only (definición §15). */
  export const isBackendConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey && env.stripePublishableKey);
  export const isDemoForced = !isBackendConfigured || data?.EXPO_PUBLIC_FORCE_DEMO === 'true';
  ```

  (Si la versión de zod instalada es 3.x, usa `z.string().url()` en lugar de `z.url()`.) **Nunca lanza.**
- Test `src/core/config/__tests__/env.test.ts` no es necesario ahora (lo cubre la fase 05 al forzar el modo demo).
- Crea tu `.env` local copiando `.env.example` con `EXPO_PUBLIC_FORCE_DEMO=true` (no se commitea).

## Paso 10 · CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check
      - run: npm test -- --ci
```

(Usa las versiones mayores más recientes de las actions si hay otras. El job de Edge Functions se añade en la fase 13.)

## Paso 11 · Development build en Android

```bash
npx expo run:android          # genera android/, compila e instala el dev client en el emulador
```

- `android/` e `ios/` deben quedar en `.gitignore` (proyecto con CNG/prebuild). Compruébalo.
- La primera compilación tarda. Si falla por Stripe (versión de Kotlin, `minSdkVersion`…), revisa la documentación de
  `@stripe/stripe-react-native` para la versión instalada; usa `expo-build-properties` solo si la doc lo pide, y anótalo.
- Debe verse "Vitrina" en terracota sobre marfil. Cambia el emulador a modo oscuro: el fondo y el texto deben cambiar.
  Si NativeWind necesita configuración extra para seguir al sistema, hazla ahora.
- Para iterar después: `npx expo start --dev-client`.
- Verificación sin mirar la pantalla: `adb exec-out screencap -p > /tmp/vitrina-shot.png` y revisa la imagen.
- Si no hay emulador disponible: **🙋 Acción del autor** → pedir que lo abra (`emulator -avd Pixel_10_Pro`) y confirme.

## Paso 12 · Comprobar la regla de arquitectura

Crea temporalmente `src/features/catalog/domain/tmp.ts` con `import { createClient } from '@supabase/supabase-js';`
y `src/core/ui/tmp.ts` con el mismo import. `npm run lint` debe fallar en ambos con los mensajes de la regla.
Bórralos después.

## Paso 13 · Bitácora y cierre

- Rellena la tabla "Versiones clave instaladas" de `bitacora.md` (`package.json`, `node -v`, `supabase --version`,
  `stripe --version`, `deno --version` si existe, `maestro --version`).
- Cierra la fase según `00-guia-general.md` §3.3. El CI del PR debe pasar.

---

## Criterios de terminado

- [ ] Proyecto creado con `create-expo-app` (plantilla `default`), sin código de ejemplo.
- [ ] `app.json` con nombre, slug, scheme `vitrina`, package/bundle `com.malpidev.vitrina`, `userInterfaceStyle: automatic` y plugin de Stripe.
- [ ] `npm run lint`, `npm run typecheck`, `npm run format:check` y `npm test -- --ci` pasan sin warnings.
- [ ] Alias `@/` apunta a `src/` y funciona en TS, Metro, ESLint y Jest.
- [ ] Development build instalado; "Vitrina" con color semántico cambia con el modo oscuro del sistema.
- [ ] Las reglas `no-restricted-imports` bloquean Supabase fuera de `core/supabase`/`data` y cualquier librería en `domain/` (comprobado y revertido).
- [ ] Estructura de carpetas creada; `.env.example` y `.env.scripts.example` commiteados; `.env` ignorado.
- [ ] CI en verde en el PR; PR mergeado con squash; bitácora actualizada (versiones incluidas).
