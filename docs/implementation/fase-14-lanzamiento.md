# Fase 14 · Lanzamiento (`v1.0.0`)

**Rama:** `feat/fase-14-lanzamiento`
**Objetivo:** dejar Vitrina en ✅ **MVP listo** y, cuando el autor complete los pasos remotos, en 🚀 **Publicado**:
backend en el proyecto Supabase compartido, Edge Functions y webhook de Stripe en remoto, APK `preview` probado en un
dispositivo, README completo con GIF, tag `v1.0.0` con el APK en GitHub Releases.
**Referencias:** definición §7.6 (Remoto), §14, §15, §16 · `CLAUDE.md` (Backend, Seguridad, Plantilla de README,
Definición de terminado) · Agendo: `docs/runbook-lanzamiento.md`, `scripts/apply-remote.sh`, `scripts/dev-otp.mjs`,
bitácora fase 13.

> Esta fase tiene dos partes. **Parte A (agente, local y reversible):** todo lo que se puede preparar sin tocar nada
> remoto. **Parte B (🙋 autor, remoto):** se ejecuta **solo** con autorización explícita del autor, paso a paso, siguiendo
> el runbook. El proyecto Supabase es **compartido con las otras 3 apps**: nunca `supabase db push`, nunca borrar nada
> que no empiece por `vitrina`.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Parte A · Preparación local (agente)

### A1 · README completo (en inglés, plantilla de `CLAUDE.md`)

1. **Vitrina** + tagline ("A mobile storefront with a persistent cart, real Stripe checkout (test mode) and live order
   tracking.") + badges (CI, versión, plataforma Android).
2. GIF de demo (15–30 s: catálogo → carrito → pago → "Paid" en vivo) + 3–4 capturas. Hasta tenerlos, comentarios
   `<!-- TODO(assets): … -->` con la lista exacta de lo que falta.
3. **Try it**: enlace al APK de la release + "Use **Explore demo** to skip sign-up — no account, no real charges" +
   tarjetas de prueba de Stripe (`4242 4242 4242 4242`) para quien use una cuenta real.
4. **Features** (lista corta de F1–F8).
5. **Tech stack** (definición §9).
6. **Architecture**: diagrama de capas (Mermaid) + por qué los repositorios son intercambiables (`supabase`/`mock`,
   modo demo, tests) + el presentador de pago por contexto.
7. **Backend**: tablas (§7.1), qué protege cada política RLS (§7.2), RPCs y por qué el servidor manda (precio, stock,
   total), máquina de estados y trigger, Realtime, bucket, las dos Edge Functions y el flujo del webhook firmado e
   idempotente, pago tardío y `needs_refund`. Nota: proyecto Supabase compartido con un schema por app.
8. **Getting started**: sin backend (demo), con Supabase local (`supabase start`, `db reset`, `images:upload`,
   `functions serve`, `stripe listen`, `.env`), development build (`npx expo run:android`).
9. **Testing**: `npm test`, `supabase test db`, `npm run functions:check`, Maestro (receta de la build release de la fase 13).
10. **Roadmap / Future**: definición §3.3 + "Ideas para el roadmap" de la bitácora.

### A2 · Scripts para el remoto (no se ejecutan en esta parte)

- `scripts/apply-remote.sh`: con `SUPABASE_DB_URL` del entorno, comprueba con `psql` si el schema `vitrina` ya existe
  (si existe, se detiene y pide confirmación explícita); si no, aplica **en orden** las 4 migraciones y `seed.sql` con
  `psql -v ON_ERROR_STOP=1 -f …`. Imprime cada archivo aplicado. Referencia: Agendo `scripts/apply-remote.sh`.
- `scripts/dev-otp.mjs` + `"dev:otp": "node --env-file=.env.scripts scripts/dev-otp.mjs"`: obtiene un código OTP sin
  enviar correo con `auth.admin.generateLink({ type: 'magiclink', email })` → `properties.email_otp` (convención de
  `CLAUDE.md`), solo para usuarios de prueba en remoto. Avisa en la salida que es solo para desarrollo.
- `.env.scripts.example` documenta `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`.

### A3 · Runbook (`docs/runbook-lanzamiento.md`, en español)

Escribe el runbook de la **Parte B** con comandos exactos y casillas `- [ ]`, basado en la lista de abajo. Añade una
sección "Estado" arriba y una sección "Assets pendientes".

### A4 · Auditoría de la definición de terminado

En la entrada de la bitácora, tabla con cada punto de `CLAUDE.md` (Definición de "terminado") y de la definición §16,
con estado (✅ / 🟡 / ⏳) y evidencia (comando, test, fase). Revisa también:
- `git grep -nE "sk_(test|live)_|whsec_|sb_secret_"` → solo textos de documentación, ningún valor real.
- `.env.example`, `.env.scripts.example` y `supabase/functions/.env.example` completos.
- `LICENSE` MIT a nombre del autor.

### A5 · Cierre de la Parte A

Verificación completa (`00-guia-general.md` §3.3), PR y merge. En `../CLAUDE.md` y `../README.md` (carpeta del
portafolio) cambia Vitrina a **✅ MVP listo** solo si todos los puntos de la auditoría que no dependen del remoto están en ✅.

## Parte B · Pasos remotos (🙋 autor, con runbook)

Cada paso lo ejecuta el autor, o el agente **solo si el autor lo autoriza explícitamente en ese momento**. Registra en
la bitácora cada paso hecho (fecha) y en "Migraciones aplicadas en remoto" cada archivo.

1. **Credenciales en la shell** (no en archivos versionados): `SUPABASE_DB_URL`, `SUPABASE_SECRET_KEY`, project ref.
2. **Migraciones + catálogo:** `./scripts/apply-remote.sh`. Después, en el Dashboard → *API settings* → *Exposed schemas*,
   añadir `vitrina` (sin quitar los de las otras apps).
3. **Imágenes:** `.env.scripts` con la URL y secret key remotas → `npm run images:upload`. Comprobar una URL pública.
4. **Edge Functions:**
   `supabase functions deploy vitrina-create-payment-intent --project-ref <ref>` y
   `supabase functions deploy vitrina-stripe-webhook --no-verify-jwt --project-ref <ref>`.
5. **Webhook de Stripe (modo test):** Dashboard de Stripe → Developers → Webhooks → endpoint
   `https://<ref>.supabase.co/functions/v1/vitrina-stripe-webhook` con los eventos `payment_intent.succeeded` y
   `payment_intent.payment_failed` → copiar su `whsec_…`.
6. **Secretos** (globales al proyecto → prefijo obligatorio):
   `supabase secrets set VITRINA_STRIPE_SECRET_KEY=sk_test_… VITRINA_STRIPE_WEBHOOK_SECRET=whsec_… --project-ref <ref>`.
   Comprobar con `supabase secrets list` que no se tocó ningún secreto de otra app.
7. **EAS:** `eas login`, `eas init` (escribe `extra.eas.projectId` en `app.json`; commitearlo en una rama `chore/`), y
   variables del entorno `preview` con `eas env:create`: `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`),
   `EXPO_PUBLIC_MERCHANT_DISPLAY_NAME=Vitrina`, `EXPO_PUBLIC_FORCE_DEMO=false`.
8. **GitHub:** `gh secret set EXPO_TOKEN` (token de expo.dev).
9. **APK de prueba:** `eas build -p android --profile preview` → instalar en un teléfono. Prueba de humo:
   - Explore demo completo en modo avión (flujo de la fase 10).
   - Sign in con el email del autor (el SMTP por defecto solo entrega a miembros del equipo; o `npm run dev:otp`).
   - Compra con `4242 4242 4242 4242` → "Paid" en vivo; el pedido aparece en el Dashboard de Stripe con el mismo importe.
   - `advance-order.sql` contra el remoto → "Shipped" en vivo.
   - Tarjeta `4000 0000 0000 0002` → error y carrito intacto.
10. **Media:** grabar el GIF (`adb shell screenrecord` + conversión con `ffmpeg`, o la herramienta del autor) y 3–4
    capturas (`adb exec-out screencap -p`) en claro y oscuro; guardarlas en `docs/media/` y enlazarlas en el README.
11. **Versión y tag:** en una rama `chore/release-v1.0.0`: `version` `1.0.0` en `app.json` y `package.json`, PR, merge;
    luego `git tag v1.0.0 && git push origin v1.0.0` → `release.yml` construye el APK y crea la GitHub Release.
    Verificar que la Release tiene el APK y que el enlace del README funciona.
12. **Visibilidad:** repo público (`gh repo edit --visibility public` si aún no lo es; comprobar antes que el historial
    no contiene secretos).
13. **Portafolio:** en `../CLAUDE.md` y `../README.md`: Vitrina → **🚀 Publicado**, con enlaces a repo y demo.

## Paso final · Cierre de la fase

- Si la Parte B queda pendiente, la fase se marca en la bitácora como `🚧 Preparada, pasos remotos pendientes`
  (no `✅`) y la barra la cuenta como en progreso (`▒`), igual que hizo Agendo.
- Cuando el autor complete la Parte B: entrada final en la bitácora, estado `✅ Terminada`, barra `14/14 (100 %)`.

---

## Criterios de terminado

- [ ] README completo según la plantilla de `CLAUDE.md` (GIF y capturas reales incluidos al terminar la Parte B).
- [ ] `apply-remote.sh`, `dev-otp.mjs` y `docs/runbook-lanzamiento.md` listos; auditoría de terminado en la bitácora.
- [ ] Sin secretos en el repo; `.env*.example` completos; `LICENSE` correcta.
- [ ] (Parte B) Backend, funciones, secretos y webhook en remoto; prueba de humo del APK superada.
- [ ] (Parte B) `v1.0.0` con APK en GitHub Releases, repo público y tablas del portafolio actualizadas a 🚀.
