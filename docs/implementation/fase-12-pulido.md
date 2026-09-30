# Fase 12 · Pulido: identidad visual, estados de UI, modo oscuro y accesibilidad

**Rama:** `feat/fase-12-pulido`
**Objetivo:** ícono, adaptive icon y splash propios (claro/oscuro); auditoría de todos los estados de UI de la
definición §12.1 **forzándolos**; auditoría de modo oscuro y contraste; accesibilidad básica. Sin features nuevas.
**Referencias:** definición §11, §12.1, §16 · `CLAUDE.md` (identidad visual propia + modo oscuro) · Agendo: bitácora
fase 11 (auditoría de estados, contraste, íconos con `sharp`, eliminación de recursos de la plantilla).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Ícono y splash

Concepto (definición §11): una **"V" estilizada formada por el toldo de un escaparate**, marfil (`#FAF7F2`) sobre
terracota (`#C4552D`, o el `primary` ajustado en la fase 02). Sin texto.

1. SVG maestros editables en `assets/source/`: `icon.svg` (1024×1024, fondo terracota), `adaptive-foreground.svg`
   (solo el símbolo, dentro de la **zona segura** central del 66 %, fondo transparente), `monochrome.svg` (símbolo en
   un solo color, para el ícono temático de Android 13+), `splash-icon.svg` (símbolo sobre transparente).
2. `scripts/generate-app-icons.mjs` (usa `sharp`, ya instalado) exporta a `assets/images/`: `icon.png` (1024),
   `adaptive-icon.png` (1024), `monochrome-icon.png` (1024), `splash-icon.png` (≈ 400 px de ancho). Script
   `"icons:generate"`.
3. `app.json`:
   - `icon: "./assets/images/icon.png"`.
   - `android.adaptiveIcon`: `foregroundImage`, `monochromeImage`, `backgroundColor: "#C4552D"` (o el primary ajustado).
   - Plugin `expo-splash-screen`: `image: "./assets/images/splash-icon.png"`, `imageWidth: 200`,
     `backgroundColor: "#C4552D"`, `dark: { backgroundColor: "#14110F" }` (en oscuro, si el símbolo marfil no contrasta,
     usa una variante `splash-icon-dark.png` en terracota claro; definición §11).
4. Elimina los recursos de la plantilla de Expo que ya no se usen (`assets/images/*` de ejemplo, `android-icon-*`,
   `ios.icon` si apunta a la plantilla) y comprueba con `grep -rn "assets/" app.json src` que no queda ninguna referencia rota.
5. `npx expo-doctor` sin errores (anota el resultado).
6. Recompila el development build (`npx expo run:android`) para ver ícono y splash reales; revisa el splash en claro y oscuro.

## Paso 2 · Auditoría de estados de UI (definición §12.1)

Fuerza cada estado **en el emulador**, no solo en tests:

- **Carga:** crea temporalmente el `MockStore` con `latencyMs: [2500, 2500]` (no lo commitees) o usa la red lenta del
  emulador en invitado.
- **Error:** en demo, `failNext` desde una prueba temporal, o en invitado/live `supabase stop`.
- **Vacío:** búsqueda sin resultados, carrito vacío, usuario sin pedidos.

Rellena esta tabla en la entrada de la bitácora (✅ / ❌ + corrección):

| Pantalla | Carga | Vacío | Error / especiales |
|---|---|---|---|
| Catálogo | skeleton 6 tarjetas | "No products match your filters" + Clear | ErrorState + Retry; error de paginación al pie |
| Detalle | skeleton | — | "Product not available"; "Out of stock" |
| Carrito | overlay en totales | "Your cart is empty" + Browse | avisos de reconciliación; "Prices will be confirmed at checkout" |
| Checkout | spinner en Pay | carrito vacío → Cart | outOfStock; cancelado; fallido; red; total cambiado |
| Pago simulado | spinner 1 s | — | Simulate failure |
| Pedidos | skeleton lista | "No orders yet"; invitado → Sign in | ErrorState; "Live updates paused" |
| Detalle del pedido | skeleton | — | "Confirming payment…" + hint 30 s; cancelado "Expired — no charge was made" |
| Sign in / Enter code | spinner | — | errores de campo; `invalidCode`; `rateLimited` |
| Account | skeleton | "Add a default address" | error al guardar → toast; error de perfil + Sign out |

Ninguna pantalla puede quedar en blanco en ningún caso (`CLAUDE.md`, definición de terminado).

## Paso 3 · Modo oscuro y contraste

- `grep -rnE "#[0-9A-Fa-f]{3,8}\b" src --include=*.tsx --include=*.ts | grep -v "core/theme/tokens.ts" | grep -v generated`
  → sin resultados (todo color sale de tokens). Corrige lo que aparezca.
- Recorre todas las pantallas en claro, oscuro y "System" alternando el tema del sistema: status bar legible, tab bar,
  headers del Stack, modales (filtros, pago simulado), PaymentSheet (`style: 'automatic'`), teclado.
- El test de contraste de la fase 02 sigue en verde; si cambiaste algún color, añade el par nuevo al test.
- Las imágenes de producto se ven bien en ambos modos (fondo neutro).

## Paso 4 · Accesibilidad básica

- Todo elemento táctil ≥ 44×44 (stepper, chips, eliminar línea, pestañas del tema). Usa `hitSlop` si el diseño es menor.
- `accessibilityLabel` en botones solo con icono (buscar, borrar búsqueda, filtros, eliminar línea, cerrar sign in);
  `accessibilityRole` en botones/enlaces; `accessibilityState` en chips seleccionados, orden seleccionado y pasos del timeline.
- Precios leídos como importe (el `accessibilityLabel` de `Price` es el texto formateado).
- Escala de fuente del sistema a 1,3: nada se corta de forma que impida usar la app (títulos en 2 líneas, botones que crecen).
- Formularios: `returnKeyType` y foco al siguiente campo en la dirección; `KeyboardAvoidingView` no tapa el botón Pay.
- Anota en la bitácora lo revisado y lo corregido.

## Paso 5 · Detalles finales

- Toasts consistentes (tono y texto) en añadir al carrito, guardar perfil/dirección, sign out.
- Textos de UI revisados en inglés (ortografía, mayúsculas consistentes: "Sign in", "Explore demo", "Checkout").
- `+not-found.tsx` con `EmptyState` y "Go home".
- Sin `console.log` en `src/` (`grep -rn "console.log" src` → vacío; los `console.warn` solo con motivo).
- Tests: siguen en verde **sin** avisos `act(...)` ni "worker failed to exit" (si aparecen, corrígelos; Agendo documenta
  las causas: temporizadores de toast y mutaciones con GC).

## Paso 6 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] Ícono, adaptive icon (con monocromo) y splash claro/oscuro propios, generados desde SVG por script; recursos de la plantilla eliminados; `expo-doctor` limpio.
- [ ] Tabla de estados de §12.1 verificada en el emulador y registrada en la bitácora; ninguna pantalla en blanco.
- [ ] Sin hex fuera de `tokens.ts`; modo oscuro revisado en todas las pantallas y modales; contraste AA en test.
- [ ] Accesibilidad básica (áreas táctiles, etiquetas, estados, escala 1,3) revisada y anotada.
- [ ] Sin `console.log`; tests sin avisos.
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
