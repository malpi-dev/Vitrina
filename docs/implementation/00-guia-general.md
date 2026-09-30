# Vitrina — Guía general de implementación

> **Lee este archivo completo antes de empezar cualquier fase.** Después lee `bitacora.md` para saber en qué
> fase vas y, por último, el archivo de la fase que toca (`fase-NN-<nombre>.md`).
> Si una sesión se corta a mitad de fase, la bitácora y `git log` de la rama te dicen dónde retomar.

## 1. Documentos de referencia (orden de prioridad)

1. `../../../CLAUDE.md` (carpeta del portafolio): reglas globales. **Prevalece** sobre todo lo demás.
2. `../definicion.md`: **qué** se construye (alcance, modelo, backend, UI). Cada fase cita las secciones (§) que necesita.
3. El archivo de la fase actual: **cómo** se construye, paso a paso.
4. `bitacora.md`: estado, decisiones tomadas durante la implementación y bloqueos.

Si encuentras una contradicción entre documentos, sigue el de mayor prioridad y **anótala en la bitácora**
(sección "Decisiones y desviaciones"). Las decisiones que ya están en esa tabla (fila "Plan") **ya están resueltas**:
aplícalas aunque la definición diga otra cosa.

### 1.1 Proyecto hermano de referencia: Agendo

`../../../Agendo/` es la otra app React Native del portafolio, con el **mismo stack** (Expo SDK 57, Expo Router,
NativeWind 4, TanStack Query, Zustand, zod, Supabase, Jest + RNTL 14) y ya implementada. Su bitácora
(`../../../Agendo/docs/implementation/bitacora.md`, tabla "Decisiones y desviaciones") recoge problemas reales
ya resueltos. Cuando una fase diga *"referencia: Agendo `<ruta>`"*:

- **Léelo y adapta el patrón**; no lo copies a ciegas. Cambia nombres (`agendo` → `vitrina`), tipos y reglas.
- Nunca importes código de Agendo ni crees dependencias entre repos. Vitrina es un repo independiente.
- Si Vitrina necesita algo distinto, manda la definición de Vitrina.

## 2. Idiomas (obligatorio)

| Qué | Idioma |
|---|---|
| Código: nombres de variables, funciones, archivos, tipos, tablas, columnas, `testID` | **Inglés** |
| Comentarios en el código y en SQL | **Inglés** |
| Textos de la UI (botones, mensajes, errores visibles) | **Inglés** |
| Mensajes de commit, títulos y descripciones de PR, nombres de rama | **Inglés** |
| `README.md` del repo | **Inglés** |
| Documentos en `docs/` (incluida la bitácora y el runbook) | **Español** |

## 3. Protocolo de cada fase (ramas y merge)

Cada fase es **una rama nueva creada desde `main`** y termina **integrada en `main`**. Sigue estos pasos siempre, en este orden.

### 3.1 Al empezar la fase

```bash
git status                               # debe estar limpio; si no, ver nota abajo
git checkout main
git pull origin main
git checkout -b feat/fase-NN-<nombre>    # ej.: feat/fase-03-dominio
```

- El nombre de la rama es exactamente el del archivo de la fase sin `.md`, con prefijo `feat/`
  (`fase-01-andamiaje.md` → `feat/fase-01-andamiaje`).
- Si `git status` no está limpio: **no borres nada**. Si los cambios son solo de `docs/`, se commitean como primer
  commit de la rama de la fase (`docs: ...`). Si son de código y no sabes de dónde salen, detente y pregunta al autor.
- Actualiza `bitacora.md`: estado de la fase → `🚧 En progreso`, fecha de inicio, "Fase actual" y barra de progreso
  (ver §5). Commit: `docs: start phase NN`.

### 3.2 Durante la fase

- Commits pequeños con **Conventional Commits** en inglés: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `ci:`.
  Ejemplo: `feat(cart): add reconcileCart use case`.
- No hagas nada que no pida la fase. Si ves algo útil fuera de alcance, anótalo en la bitácora ("Ideas para el roadmap").
- Los pasos marcados con **🙋 Acción del autor** requieren que el humano haga algo (crear cuentas, `stripe login`,
  claves, probar en un teléfono…). **Detente, explica exactamente qué debe hacer y espera** su confirmación.
  No inventes credenciales ni te saltes el paso. Si el paso no bloquea el resto de la fase, anótalo en la bitácora
  como pendiente y sigue con lo demás.
- Nunca ejecutes nada contra el **proyecto Supabase remoto**, Stripe en vivo, EAS o GitHub Releases salvo en la fase 14
  y siempre con autorización explícita del autor.

### 3.3 Al terminar la fase

1. Ejecuta la verificación completa (los scripts existen desde la fase 01):
   ```bash
   npm run lint && npm run typecheck && npm run format:check && npm test -- --ci
   ```
   Todo debe pasar **sin errores ni warnings**. Si la fase toca la base de datos (desde la fase 04), además:
   `supabase db reset && supabase test db`. Si toca Edge Functions (desde la fase 11): `npm run functions:check`.
2. Revisa la checklist **"Criterios de terminado"** del archivo de la fase. Cada casilla debe cumplirse de verdad;
   si una no se puede cumplir (p. ej. requiere al autor), anótala como pendiente en la bitácora con el motivo.
3. Actualiza `bitacora.md`: estado `✅ Terminada`, fecha de fin, barra de progreso, "Fase actual" → la siguiente,
   y una entrada en "Registro" con lo hecho, decisiones y pendientes. Commit: `docs: update implementation log for phase NN`.
4. Integra en `main` con **squash merge** vía Pull Request:
   ```bash
   git push -u origin feat/fase-NN-<nombre>
   gh pr create --base main --title "feat: phase NN - <short english title>" \
     --body "<resumen en inglés de lo hecho + checklist de la fase>"
   gh pr checks --watch                     # espera a que el CI termine
   gh pr merge --squash --delete-branch
   git checkout main && git pull origin main
   ```
   - Si el CI falla: corrige en la misma rama, `git push`, y vuelve a esperar. **Nunca** hagas merge con CI en rojo.
   - Si `gh auth status` falla: **🙋 Acción del autor** → pedir que ejecute `gh auth login`.
   - En la fase 01 el CI se crea en la propia rama: el PR ya lo ejecuta.
   - Solo si el autor lo autoriza explícitamente, alternativa local sin PR:
     `git checkout main && git merge --squash feat/fase-NN-<nombre> && git commit -m "feat: phase NN - ..." && git push origin main && git branch -D feat/fase-NN-<nombre>`.
5. Anota el número de PR en la entrada de la bitácora (si hiciste el commit de bitácora antes de crear el PR, el
   número puede quedar como "ver historial de `main`").
6. No empieces la fase siguiente en la misma rama. Cada fase arranca desde `main` actualizado.

## 4. Reglas técnicas que aplican a todas las fases

### 4.1 Arquitectura (definición §8)

```
src/
  app/                    # rutas de Expo Router: archivos delgados que solo reexportan pantallas
  core/                   # config, supabase, di, session, theme, errors, query, ui, utils
  features/<feature>/
    domain/               # modelos, interfaces de repositorio, casos de uso, validaciones zod. Puro.
    data/                 # supabase-*.repository.ts, mock-*.repository.ts, *.mapper.ts
    presentation/         # screens/, components/, hooks/, stores de UI (*.store.ts)
  test/                   # utilidades de test (render con providers, cliente Supabase falso, mocks)
```

- `domain/` **no importa** nada de `data/`, `presentation/`, React, React Native, Expo, Supabase, Stripe,
  TanStack Query ni Zustand. Puede importar otros `domain/`, `@/core/errors`, `@/core/utils/money` y `zod`.
  Una regla de ESLint lo impone (fase 01).
- La UI **nunca** importa `@supabase/supabase-js`: siempre `useRepositories().<repo>`. ESLint lo impone.
- `@stripe/stripe-react-native` solo se importa en `src/features/checkout/presentation/payment/`. ESLint lo impone.
- Cada repositorio tiene implementación `supabase-*` y `mock-*` (el carrito no es un repositorio: definición §6.5).
- Los repositorios **lanzan** `DomainError`; nunca dejan escapar errores crudos de Supabase, PostgREST o Stripe.
- Casos de uso solo donde hay lógica real (definición §6.4). No crees `getProductsUseCase` que solo reenvía.
- Las rutas de `src/app/` solo reexportan: `export { default } from '@/features/catalog/presentation/screens/catalog-screen';`
  (más `options`/`unstable_settings` si hacen falta).

### 4.2 Estilo de código

- **Nombres de archivo** en `kebab-case`, con los sufijos de la definición §8.2: `supabase-products.repository.ts`,
  `product.mapper.ts`, `cart.store.ts`, `catalog-screen.tsx`, `use-products.ts`. Componentes y tipos en `PascalCase`;
  funciones y variables en `camelCase`.
- **TypeScript strict**: prohibido `any` (usa `unknown` y estrecha), prohibido `@ts-ignore`/`@ts-expect-error` salvo
  en tests con comentario. `// eslint-disable-next-line` solo con justificación en la misma línea.
- **Dinero:** siempre `number` entero en **centavos** (`priceCents`, `totalCents`). Nunca `float` para dinero.
  Formatear solo en presentación con `formatMoney(cents)` (`@/core/utils/money`).
- **Dependencias:** instala con `npx expo install <pkg>` (fija versiones compatibles con el SDK). No añadas librerías
  que no estén en la definición §9 o en el archivo de la fase sin anotarlo en la bitácora y justificarlo.
- **No adivines APIs.** Si dudas de la firma de una librería (NativeWind, Expo Router, supabase-js, Stripe…), revisa
  los tipos en `node_modules/<pkg>` o la documentación oficial de la versión instalada. Anota versiones clave en la bitácora.
- **`testID`** estables en `kebab-case` en todo elemento que usen los tests o Maestro. Los de productos y pedidos
  incluyen el id: `product-card-<uuid>`, `order-row-<uuid>`. Cada fase lista los `testID` obligatorios.
- **Secretos:** nunca commitees `.env`, `.env.scripts`, `supabase/functions/.env` ni claves. La secret key de
  Supabase (`sb_secret_…`) y las claves `sk_`/`whsec_` de Stripe **jamás** van en el cliente ni con prefijo `EXPO_PUBLIC_`.
- **Estados de UI:** toda pantalla que carga datos tiene carga (skeleton), vacío y error con "Retry" (definición §12.1).
- **Modo oscuro:** todo color sale de los tokens del tema (definición §11, fase 02); nada de hex sueltos en componentes.
- **Supabase SQL:** toda función `security definer` lleva `set search_path = ''` y nombres calificados (`vitrina.orders`,
  `pg_catalog.now()` no hace falta, pero sí `vitrina.` en tablas/tipos/funciones propias y `extensions.` en extensiones).

### 4.3 Entorno local

- Emulador Android: **Pixel** con API reciente (el autor usa uno llamado `Pixel_10_Pro`). Comprueba con `adb devices`.
- Vitrina usa **development build** desde la fase 01 (Stripe no funciona en Expo Go): `npx expo run:android` compila e
  instala; luego `npx expo start --dev-client` para iterar. Solo hay que recompilar cuando cambian paquetes nativos o
  `app.json`/plugins.
- Desde el emulador, el Mac es `10.0.2.2` (Supabase local = `http://10.0.2.2:54321`).
- **Supabase local comparte puertos con Agendo y Centavo** (54321–54324). Antes de `supabase start` en Vitrina,
  detén los otros: `docker ps --format '{{.Names}}' | grep supabase_` y, si aparecen, `supabase stop --project-id agendo`
  (o `centavo`). Nunca uses `supabase stop --no-backup` ni borres volúmenes de otros proyectos.

## 5. Cómo actualizar la barra de progreso

La barra de `bitacora.md` tiene **un bloque por fase** (14 en total):

- `█` = fase terminada · `▒` = fase en progreso · `░` = fase pendiente.
- Formato: `` `█████▒░░░░░░░░` 5/14 fases terminadas (36 %) ``.
- El porcentaje es `terminadas / 14 × 100`, redondeado al entero (1→7, 2→14, 3→21, 4→29, 5→36, 6→43, 7→50,
  8→57, 9→64, 10→71, 11→79, 12→86, 13→93, 14→100).
- Actualiza también "Fase actual" y "Última actualización".

## 6. Cuando algo no sale

1. Lee el error completo. Busca la causa, no el parche.
2. Revisa si Agendo ya resolvió ese mismo problema (su bitácora, tabla de decisiones).
3. Si una instrucción de la fase no funciona con la versión instalada de una librería, adapta siguiendo la
   documentación oficial y **anota la desviación** en la bitácora.
4. Si tras 2–3 intentos razonables sigues bloqueado, anota el bloqueo en la bitácora ("Bloqueos") y pregunta al autor.
5. Nunca uses `--no-verify`, `git push --force` a `main`, ni desactives reglas de lint o tests para "pasar".

## 7. Mapa de fases

| # | Archivo | Objetivo | Se apoya en |
|---|---|---|---|
| 01 | `fase-01-andamiaje.md` | Proyecto Expo, dependencias (incl. Stripe), TS strict, NativeWind con tokens, ESLint/Prettier, Jest, estructura, CI, primer development build | §9, §10, §14, §15 |
| 02 | `fase-02-core.md` | Errores de dominio, dinero, tema (claro/oscuro + contraste AA), fuentes, UI base, cliente Supabase, QueryClient, env | §6.6, §8.4, §11 |
| 03 | `fase-03-dominio.md` | Modelos, interfaces de repositorio, casos de uso puros (carrito, pedidos) y validaciones con tests exhaustivos | §6 |
| 04 | `fase-04-backend-local.md` | Supabase local: schema, RLS, funciones y triggers, Realtime, bucket, seed, pgTAP, tipos generados | §7 |
| 05 | `fase-05-modo-demo.md` | Imágenes de producto, fixtures, MockStore, repos mock, DI, sesión, navegación base, Sign in con *Explore demo* | §2, §5, §8.3, §12.2 |
| 06 | `fase-06-catalogo.md` | Catálogo (búsqueda, filtros, paginación) y detalle; repo Supabase de productos; subida de imágenes a Storage | F3, F4 |
| 07 | `fase-07-carrito.md` | Carrito persistente, reconciliación, totales, badge | F5 |
| 08 | `fase-08-auth-y-cuenta.md` | Auth OTP, `ensure_profile`, gates, Account (perfil, dirección, tema, salir) | F1, F8 |
| 09 | `fase-09-pedidos.md` | Historial, detalle, línea de tiempo y estado en vivo (Realtime + mock) | F7 |
| 10 | `fase-10-checkout-demo.md` | Checkout completo con pago simulado en modo demo | F6 (CA7), §5.1 D |
| 11 | `fase-11-pagos-stripe.md` | Edge Functions, PaymentSheet, webhook firmado, pago real en modo test | F6 |
| 12 | `fase-12-pulido.md` | Ícono, splash, auditoría de estados, modo oscuro y accesibilidad | §11, §12.1 |
| 13 | `fase-13-e2e-y-ci.md` | Maestro, job de Edge Functions en CI, workflow de release | §13, §14 |
| 14 | `fase-14-lanzamiento.md` | Supabase remoto, Stripe webhook remoto, APK preview, README, `v1.0.0` | §14, §16 |

**Principio de orden:** todo se construye primero sobre el **modo demo** (mock) y después se conecta al backend real,
para que `main` siempre tenga una app que se puede enseñar.
