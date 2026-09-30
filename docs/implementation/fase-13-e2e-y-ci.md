# Fase 13 · E2E con Maestro, CI de Edge Functions y workflow de release

**Rama:** `feat/fase-13-e2e-y-ci`
**Objetivo:** flujo Maestro `demo-checkout.yaml` en verde de forma estable (obligatorio), flujo `live-checkout.yaml`
documentado para ejecución local, job de Edge Functions en CI, `eas.json` y `release.yml` (APK en GitHub Releases en
cada tag `v*`). No se ejecuta nada remoto: el primer release real es la fase 14.
**Referencias:** definición §13 (E2E), §14 · `CLAUDE.md` (Común: Maestro, GitHub Actions) · Agendo: `.maestro/*.yaml`,
`.github/workflows/release.yml`, `eas.json`, bitácora fase 12 (cómo correr E2E en build release).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. `maestro --version` (Java 17). Si falta: **🙋 Acción del autor** (instalar Maestro).

## Paso 1 · Build para E2E

Lección de Agendo: los flujos se ejecutan sobre una **build release local**, y necesitan ver la pantalla *Sign in*
(con demo forzado el botón *Explore demo* no existe).

1. Variables solo para esta build (no toques tu `.env` de desarrollo; usa variables de entorno en la línea de comandos
   o un `.env.e2e` ignorado por git):
   `EXPO_PUBLIC_FORCE_DEMO=false`, `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:59999` (ficticia), una publishable key
   ficticia, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder`.
2. `npx expo prebuild --platform android --clean` y `npx expo run:android --variant release --no-bundler`.
   Si Gradle reutiliza un bundle viejo, borra `android/app/build/generated/assets` y repite (Agendo).
3. Documenta la receta exacta en el README (sección Testing) y en la bitácora.

## Paso 2 · `.maestro/demo-checkout.yaml` (obligatorio)

Flujo de la definición §13: Explore demo → buscar "mug" → detalle → Add to cart → Cart → Checkout → Pay (simulated) →
ver "Paid" y luego "Shipped".

```yaml
appId: com.malpidev.vitrina
name: Demo checkout (simulated payment)
---
- launchApp:
    clearState: true
- tapOn:
    id: 'explore-demo-button'
- tapOn:
    id: 'search-input'
- inputText: 'mug'
- hideKeyboard
- extendedWaitUntil:
    visible:
      id: 'product-card-00000000-0000-4000-8000-000000000207' # Ivory Stoneware Mug
    timeout: 10000
- tapOn:
    id: 'product-card-00000000-0000-4000-8000-000000000207'
- tapOn:
    id: 'add-to-cart-button'
- assertVisible: 'Added to cart'
- back
- tapOn:
    id: 'tab-cart'
- tapOn:
    id: 'checkout-button'
- assertVisible:
    id: 'demo-banner'
- scrollUntilVisible:
    element:
      id: 'pay-button'
- tapOn:
    id: 'pay-button'
- tapOn:
    id: 'simulated-pay-button'
- extendedWaitUntil:
    visible: 'Paid'
    timeout: 10000
- extendedWaitUntil:
    visible: 'Shipped'
    timeout: 15000
```

- Ajusta a la UI real (p. ej. si "Paid" aparece también en el timeline, usa el `testID` del badge o del paso con
  `accessibilityState`). **No** cambies `testID` de la app para acomodar el flujo sin actualizar los tests unitarios.
- Script: `"e2e": "maestro test .maestro/demo-checkout.yaml"`.
- Criterio de estabilidad: **3 ejecuciones seguidas en verde**. Anota los tiempos en la bitácora.

## Paso 3 · `.maestro/live-checkout.yaml` (manual/local)

Requiere Supabase local, `supabase functions serve`, `stripe listen` (fase 11) y una build que apunte a Supabase local
con `pk_test_…` real. Flujo: Sign in con `shopper@vitrina.dev` → código OTP → añadir producto → Checkout → PaymentSheet
con `4242 4242 4242 4242`, fecha futura, CVC `123`, ZIP `12345` → "Paid" en vivo.

- El código OTP se puede leer desde Maestro con `runScript` y la API de Mailpit en el Mac:
  `http.get('http://127.0.0.1:54324/api/v1/message/latest')` → extraer `/\b\d{6}\b/` del texto → `output.code` →
  `inputText: ${output.code}`. Verifica que tu versión de Mailpit soporta `latest`; si no, lista `/api/v1/messages`.
- Los campos del PaymentSheet son nativos de Stripe: localízalos por texto ("Card number", "MM / YY", "CVC", "ZIP").
  Si Maestro no logra escribir en ellos de forma estable, deja esos pasos documentados como **manuales** en el propio
  YAML (comentarios) y en el README. La variante con `4000 0000 0000 0002` queda manual.
- Este flujo **no** va al CI.

## Paso 4 · CI de Edge Functions

En `.github/workflows/ci.yml` añade un job paralelo:

```yaml
  functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x
      - run: deno check supabase/functions/*/index.ts
      - run: deno lint supabase/functions
      - run: deno test supabase/functions
```

(Mismos comandos que `npm run functions:check`. Usa las versiones mayores vigentes de las actions.)

Maestro **no** corre en CI (necesita emulador; definición §14 lo permite y Agendo tomó la misma decisión). Anótalo.

## Paso 5 · `eas.json` y `release.yml`

`eas.json` escrito a mano (no se ejecuta `eas init` sin el autor; referencia Agendo):

```json
{
  "cli": { "appVersionSource": "local" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "environment": "development" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" }, "environment": "preview" },
    "production": { "environment": "production" }
  }
}
```

`.github/workflows/release.yml` (en cada tag `v*`; referencia Agendo, cambiando nombres):
1. Job `check`: `npm ci`, lint, typecheck, tests.
2. Job `build-and-release` (`needs: check`): `expo/expo-github-action` con `secrets.EXPO_TOKEN` →
   `eas build -p android --profile preview --non-interactive --wait --json > build.json` → descarga el APK
   (`jq -r '.[0].artifacts.buildUrl'`) como `vitrina-${GITHUB_REF_NAME}.apk` →
   `gh release create "$GITHUB_REF_NAME" <apk> --title "Vitrina $GITHUB_REF_NAME" --generate-notes`.
3. `permissions: contents: write`.

Las variables `EXPO_PUBLIC_*` del build `preview` vienen de **EAS Environment Variables** (entorno `preview`), no del
repo (definición §14). Se crean en la fase 14.

No lo ejecutes (no hay tag ni `EXPO_TOKEN`). Valida la sintaxis con `actionlint` si está disponible, o revisándolo con cuidado.

## Paso 6 · Cierre

`00-guia-general.md` §3.3. El PR debe pasar **ambos** jobs del CI (`check` y `functions`).

---

## Criterios de terminado

- [ ] `demo-checkout.yaml` en verde 3 veces seguidas sobre build release local; receta documentada.
- [ ] `live-checkout.yaml` creado y ejecutado en local al menos una vez (o sus pasos manuales documentados y hechos a mano), resultado en la bitácora.
- [ ] Job `functions` en CI en verde.
- [ ] `eas.json` con `development` / `preview` (APK) / `production`; `release.yml` listo y revisado (sin ejecutar).
- [ ] lint/typecheck/format/test + `functions:check` en verde; PR mergeado; bitácora actualizada (incluye la decisión de Maestro fuera del CI).
