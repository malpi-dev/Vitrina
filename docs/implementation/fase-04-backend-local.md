# Fase 04 · Backend local (Supabase)

**Rama:** `feat/fase-04-backend-local`
**Objetivo:** el schema `vitrina` completo en Supabase local: tablas, constraints, RLS comentada, triggers, RPCs
(`ensure_profile`, `create_order`, pagos y avance de estados), Realtime en `orders`, bucket `vitrina-products`, catálogo
de 30 productos (misma fuente que el modo demo), tests pgTAP y tipos TypeScript generados.
**Referencias:** definición §6.2, §6.3, §7 completo · Agendo: `supabase/config.toml`, `supabase/templates/otp.html`,
`supabase/tests/agendo.test.sql`, `docs/implementation/fase-04-backend-local.md`.
**Requisitos previos:** Docker Desktop abierto (`docker info` responde). Si no: **🙋 Acción del autor**.

> Todo el SQL de este archivo es **de referencia**: revísalo, ejecútalo y corrige lo que falle con la versión real de
> Postgres/CLI, anotando las diferencias en la bitácora. Nombres y comentarios en inglés.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Detén otros Supabase locales (guía §4.3): Agendo y Centavo usan los mismos puertos.

## Paso 1 · Inicializar Supabase

```bash
supabase init            # responde "no" a generar settings de VS Code/Deno si pregunta
```

Edita `supabase/config.toml` (respeta las claves que traiga tu versión de la CLI):

```toml
project_id = "vitrina"

[api]
schemas = ["public", "graphql_public", "vitrina"]
extra_search_path = ["public", "extensions"]

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]

[auth]
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = true
otp_length = 6
otp_expiry = 3600

[auth.rate_limit]
email_sent = 100          # local only; the remote project keeps its defaults

# Local-only templates (Mailpit). The remote project keeps its shared template (CLAUDE.md).
[auth.email.template.confirmation]
subject = "Your verification code"
content_path = "./supabase/templates/otp.html"

[auth.email.template.magic_link]
subject = "Your verification code"
content_path = "./supabase/templates/otp.html"
```

`supabase/templates/otp.html` (igual que Agendo):
`<h2>Your verification code</h2><p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p><p>It expires in 1 hour. If you didn't request it, ignore this email.</p>`

```bash
supabase start           # primera vez tarda. Anota URL, publishable key y secret key locales (no se commitean).
```

## Paso 2 · Catálogo compartido (fuente única de demo y seed)

La definición §7.6/§12.2 exige que el seed y los fixtures del modo demo tengan **los mismos UUID, precios y stock**.
Para que no diverjan, hay **una sola fuente**: `src/features/demo/data/fixtures/catalog.json`, y el seed se **genera** de ella.

### 2.1 IDs estables

- Categorías: `00000000-0000-4000-8000-0000000001NN` (NN = 01…05).
- Productos: `00000000-0000-4000-8000-0000000002NN` (NN = 01…30).
- `createdAt` del producto NN: `2026-09-01T12:00:00Z` + (NN − 1) días (el 30 es el más nuevo).
- `imagePaths`: `["<slug>-1.webp"]`; los productos marcados con **3 img** tienen `-1`, `-2`, `-3`.

### 2.2 Categorías

| NN | slug | name | sortOrder |
|---|---|---|---|
| 01 | `coffee` | Coffee | 1 |
| 02 | `kitchen` | Kitchen | 2 |
| 03 | `stationery` | Stationery | 3 |
| 04 | `accessories` | Accessories | 4 |
| 05 | `home` | Home | 5 |

### 2.3 Productos (todos `isActive: true`, `currency: "USD"`)

| NN | slug | name | cat | price_cents | stock | img |
|---|---|---|---|---|---|---|
| 01 | `ethiopia-yirgacheffe-beans` | Ethiopia Yirgacheffe Beans | 01 | 1850 | 40 | 1 |
| 02 | `colombia-huila-beans` | Colombia Huila Beans | 01 | 1650 | 35 | 1 |
| 03 | `house-espresso-blend` | House Espresso Blend | 01 | 1450 | 50 | 1 |
| 04 | `decaf-swiss-water-beans` | Decaf Swiss Water Beans | 01 | 1550 | 2 | 1 |
| 05 | `cold-brew-concentrate` | Cold Brew Concentrate | 01 | 1200 | 18 | 1 |
| 06 | `chai-spice-mix` | Chai Spice Mix | 01 | 950 | **0** | 1 |
| 07 | `ivory-stoneware-mug` | Ivory Stoneware Mug | 02 | 2200 | 25 | 3 |
| 08 | `terracotta-stoneware-mug` | Terracotta Stoneware Mug | 02 | 2200 | 3 | 1 |
| 09 | `ceramic-pour-over-dripper` | Ceramic Pour-Over Dripper | 02 | 3400 | 12 | 3 |
| 10 | `glass-carafe` | Glass Carafe 600 ml | 02 | 2800 | 10 | 1 |
| 11 | `gooseneck-kettle` | Gooseneck Kettle | 02 | 8900 | 6 | 3 |
| 12 | `manual-burr-grinder` | Manual Burr Grinder | 02 | 12000 | 1 | 1 |
| 13 | `linen-notebook-a5` | Linen Notebook A5 | 03 | 1800 | 30 | 1 |
| 14 | `dot-grid-journal` | Dot Grid Journal | 03 | 2400 | 20 | 1 |
| 15 | `brass-ballpoint-pen` | Brass Ballpoint Pen | 03 | 3600 | 8 | 1 |
| 16 | `washi-tape-set` | Washi Tape Set | 03 | 900 | 40 | 1 |
| 17 | `weekly-planner-pad` | Weekly Planner Pad | 03 | 1400 | **0** | 1 |
| 18 | `kraft-envelopes` | Kraft Envelopes (20) | 03 | 600 | 50 | 1 |
| 19 | `canvas-tote-bag` | Canvas Tote Bag | 04 | 2600 | 22 | 3 |
| 20 | `leather-card-holder` | Leather Card Holder | 04 | 4200 | 9 | 1 |
| 21 | `insulated-travel-mug` | Insulated Travel Mug | 04 | 3200 | 14 | 1 |
| 22 | `merino-wool-beanie` | Merino Wool Beanie | 04 | 3800 | 2 | 1 |
| 23 | `brass-key-ring` | Brass Key Ring | 04 | 1500 | 30 | 1 |
| 24 | `tortoise-sunglasses` | Tortoise Sunglasses | 04 | 6800 | 5 | 1 |
| 25 | `cedar-soy-candle` | Cedar Soy Candle | 05 | 2900 | 16 | 3 |
| 26 | `linen-napkins-set` | Linen Napkins (Set of 4) | 05 | 3400 | 11 | 1 |
| 27 | `ceramic-bud-vase` | Ceramic Bud Vase | 05 | 4600 | 7 | 1 |
| 28 | `cotton-throw-blanket` | Cotton Throw Blanket | 05 | 11500 | 4 | 1 |
| 29 | `stoneware-incense-holder` | Stoneware Incense Holder | 05 | 1900 | 13 | 1 |
| 30 | `glass-plant-mister` | Glass Plant Mister | 05 | 2100 | 3 | 1 |

Buscar "mug" devuelve 07, 08 y 21 (lo usa Maestro). Stock bajo (1–3): 04, 08, 12, 22, 30. Sin stock: 06 y 17.

### 2.4 `catalog.json`

```json
{
  "categories": [{ "id": "…0101", "slug": "coffee", "name": "Coffee", "sortOrder": 1 }],
  "products": [{
    "id": "00000000-0000-4000-8000-000000000201", "slug": "ethiopia-yirgacheffe-beans",
    "name": "Ethiopia Yirgacheffe Beans", "description": "…", "priceCents": 1850, "currency": "USD",
    "categoryId": "00000000-0000-4000-8000-000000000101", "imagePaths": ["ethiopia-yirgacheffe-beans-1.webp"],
    "stock": 40, "isActive": true, "createdAt": "2026-09-01T12:00:00.000Z"
  }]
}
```

Escribe una **descripción realista en inglés de 1–2 frases** por producto (origen, material, uso). Nada de lorem ipsum.

### 2.5 Generador del seed: `scripts/generate-seed.mjs`

Lee `catalog.json` y escribe `supabase/seed.sql` con:
- Cabecera `-- GENERATED by scripts/generate-seed.mjs from src/features/demo/data/fixtures/catalog.json. Do not edit.`
- `insert into vitrina.categories (id, slug, name, sort_order) values … on conflict (id) do nothing;`
- `insert into vitrina.products (id, slug, name, description, price_cents, currency, category_id, image_paths, stock, is_active, created_at) values … on conflict (id) do nothing;`
- Escapa comillas simples (`'` → `''`). Arrays como `array['a.webp','b.webp']::text[]`.
- **No** inserta usuarios ni pedidos (auth.users es compartido; los pedidos de demo solo existen en el mock).

Script en `package.json`: `"db:seed:generate": "node scripts/generate-seed.mjs"`. Ejecútalo y commitea ambos archivos.

## Paso 3 · Migración 1: schema (`supabase/migrations/20261005000100_vitrina_schema.sql`)

Crea las migraciones a mano con estos nombres (definición §7.6). Todas empiezan con `create schema if not exists vitrina;`.

```sql
create schema if not exists vitrina;
create extension if not exists pg_trgm with schema extensions;

grant usage on schema vitrina to anon, authenticated, service_role;

create type vitrina.order_status as enum ('pending_payment', 'paid', 'shipped', 'delivered', 'canceled');

create table vitrina.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  default_address jsonb check (default_address is null or jsonb_typeof(default_address) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vitrina.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

create table vitrina.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  currency char(3) not null default 'USD' check (currency = 'USD'),
  category_id uuid not null references vitrina.categories (id),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 3),
  stock integer not null check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on vitrina.products (category_id);
create index products_active_created_idx on vitrina.products (is_active, created_at desc);
create index products_price_idx on vitrina.products (price_cents);
create index products_name_trgm_idx on vitrina.products using gin (name extensions.gin_trgm_ops);

create table vitrina.orders (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  status vitrina.order_status not null default 'pending_payment',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency char(3) not null default 'USD' check (currency = 'USD'),
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  stripe_payment_intent_id text unique,
  last_payment_error text,
  needs_refund boolean not null default false,   -- late payment that could not be fulfilled (bitácora)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  canceled_at timestamptz,
  constraint orders_total_matches check (total_cents = subtotal_cents + shipping_cents)
);
create index orders_user_created_idx on vitrina.orders (user_id, created_at desc);
-- Business rule 5: at most one pending order per user.
create unique index orders_one_pending_per_user on vitrina.orders (user_id) where status = 'pending_payment';

create table vitrina.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references vitrina.orders (id) on delete cascade,
  product_id uuid not null references vitrina.products (id),
  product_name text not null,                                  -- frozen at purchase time
  unit_price_cents integer not null check (unit_price_cents > 0), -- frozen at purchase time
  quantity integer not null check (quantity between 1 and 10),
  line_total_cents integer generated always as (unit_price_cents * quantity) stored,
  unique (order_id, product_id)
);

-- Stripe webhook idempotency: one row per processed event.
create table vitrina.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- Table privileges. RLS (next migration) decides which rows are visible.
grant select on vitrina.categories, vitrina.products to anon, authenticated;
grant select on vitrina.profiles, vitrina.orders, vitrina.order_items to authenticated;
grant update (full_name, default_address) on vitrina.profiles to authenticated;  -- never id
grant all on all tables in schema vitrina to service_role;
```

## Paso 4 · Migración 2: RLS (`20261005000200_vitrina_rls.sql`)

Cada política con comentario SQL **y** `comment on policy` (definición §7.2):

```sql
create schema if not exists vitrina;

alter table vitrina.profiles enable row level security;
alter table vitrina.categories enable row level security;
alter table vitrina.products enable row level security;
alter table vitrina.orders enable row level security;
alter table vitrina.order_items enable row level security;
alter table vitrina.stripe_events enable row level security;

-- profiles: each user reads and edits only their own row. No insert (ensure_profile) and no delete.
create policy profiles_select_own on vitrina.profiles for select to authenticated using (id = (select auth.uid()));
comment on policy profiles_select_own on vitrina.profiles is 'A user can only read their own profile.';
create policy profiles_update_own on vitrina.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
comment on policy profiles_update_own on vitrina.profiles is 'A user can only edit their own profile (column grants limit it to full_name and default_address).';

-- categories: public catalog, read-only for clients.
create policy categories_select_all on vitrina.categories for select to anon, authenticated using (true);
comment on policy categories_select_all on vitrina.categories is 'The catalog is public; only the secret key / Studio can change it.';

-- products: only active products are exposed; nobody can change prices or stock from the client.
create policy products_select_active on vitrina.products for select to anon, authenticated using (is_active);
comment on policy products_select_active on vitrina.products is 'Inactive products are hidden; no client writes (prices and stock are server-owned).';

-- orders: a user only sees their own orders. No insert/update/delete: only security definer RPCs and the secret key.
create policy orders_select_own on vitrina.orders for select to authenticated using (user_id = (select auth.uid()));
comment on policy orders_select_own on vitrina.orders is 'Users only see their own orders; they can never mark an order as paid.';

-- order_items: inherit visibility from their order.
create policy order_items_select_own on vitrina.order_items for select to authenticated
  using (exists (select 1 from vitrina.orders o where o.id = order_id and o.user_id = (select auth.uid())));
comment on policy order_items_select_own on vitrina.order_items is 'Order lines are visible only to the owner of the order.';

-- stripe_events: RLS on and no policies on purpose -> only the secret key (Edge Function) can access it.
comment on table vitrina.stripe_events is 'RLS enabled without policies: only service_role (webhook) can read/write.';
```

## Paso 5 · Migración 3: funciones y triggers (`20261005000300_vitrina_functions.sql`)

Reglas para **todas** las funciones: `set search_path = ''`, nombres calificados, errores de negocio con
`raise exception using message = '<code>', errcode = 'P0001'[, detail = <json>]` (los mapea `mapSupabaseError`, fase 02).

### 5.1 Utilidades y triggers

```sql
create schema if not exists vitrina;

create function vitrina.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_set_updated_at before update on vitrina.profiles for each row execute function vitrina.set_updated_at();
create trigger products_set_updated_at before update on vitrina.products for each row execute function vitrina.set_updated_at();
create trigger orders_set_updated_at before update on vitrina.orders for each row execute function vitrina.set_updated_at();

-- Same rule as calculateCartTotals (cart/domain): $4.99 flat, free from $50.00.
create function vitrina.shipping_cents(p_subtotal_cents integer) returns integer
language sql immutable set search_path = '' as $$
  select case when p_subtotal_cents >= 5000 then 0 else 499 end
$$;

-- VT- + 4 chars without ambiguous letters/digits (0/O, 1/I/L, U).
create function vitrina.generate_short_code() returns text language plpgsql set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text;
begin
  loop
    code := 'VT-';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from vitrina.orders where short_code = code);
  end loop;
  return code;
end $$;

-- State machine (definición §6.2 + late payment). Also stamps the status timestamps.
create function vitrina.orders_enforce_status_transition() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (
    (old.status = 'pending_payment' and new.status in ('paid', 'canceled'))
    or (old.status = 'paid' and new.status = 'shipped')
    or (old.status = 'shipped' and new.status = 'delivered')
    or (old.status = 'canceled' and new.status = 'paid')
  ) then
    raise exception using message = 'INVALID_TRANSITION', errcode = 'P0001',
      detail = format('%s -> %s', old.status, new.status);
  end if;
  case new.status
    when 'paid' then new.paid_at := now(); new.canceled_at := null;
    when 'shipped' then new.shipped_at := now();
    when 'delivered' then new.delivered_at := now();
    when 'canceled' then new.canceled_at := now();
    else null;
  end case;
  return new;
end $$;
create trigger orders_enforce_status_transition before update of status on vitrina.orders
  for each row execute function vitrina.orders_enforce_status_transition();

-- Internal: cancels a pending order and gives its stock back. Not callable by clients.
create function vitrina.cancel_pending_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update vitrina.orders set status = 'canceled' where id = p_order_id and status = 'pending_payment';
  if found then
    update vitrina.products p set stock = p.stock + oi.quantity
    from vitrina.order_items oi
    where oi.order_id = p_order_id and oi.product_id = p.id;
  end if;
end $$;
```

### 5.2 `ensure_profile()`

```sql
-- The only way to create a profile (no trigger on the shared auth.users). Idempotent.
create function vitrina.ensure_profile() returns vitrina.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile vitrina.profiles;
begin
  if v_uid is null then
    raise exception using message = 'unauthorized', errcode = 'P0001';
  end if;
  insert into vitrina.profiles (id) values (v_uid) on conflict (id) do nothing;
  select * into v_profile from vitrina.profiles where id = v_uid;
  return v_profile;
end $$;
```

### 5.3 `create_order(p_items jsonb, p_shipping_address jsonb)`

Recibe `p_items = [{ "productId": "<uuid>", "quantity": 2 }, …]` (cualquier otro campo, como un precio, **se ignora**)
y la dirección en camelCase (`fullName`, `line1`, `line2`, `city`, `state`, `postalCode`, `country`, `phone`).

```sql
create function vitrina.create_order(p_items jsonb, p_shipping_address jsonb) returns vitrina.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_bad uuid[];
  v_subtotal integer;
  v_order vitrina.orders;
  v_pending uuid;
begin
  if v_uid is null then
    raise exception using message = 'unauthorized', errcode = 'P0001';
  end if;

  -- 1. Validate the payload shape (1-20 lines, integer quantities 1-10, valid uuids, no duplicates).
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using message = 'validation', errcode = 'P0001';
  end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 20
     or exists (
       select 1 from jsonb_array_elements(p_items) e
       where jsonb_typeof(e -> 'quantity') is distinct from 'number'
          or (e ->> 'quantity')::numeric not between 1 and 10
          or (e ->> 'quantity')::numeric <> trunc((e ->> 'quantity')::numeric)
          or coalesce(e ->> 'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     )
     or (select count(distinct e ->> 'productId') from jsonb_array_elements(p_items) e) <> v_count then
    raise exception using message = 'validation', errcode = 'P0001';
  end if;

  -- 2. Validate the shipping address (same required fields as shippingAddressSchema).
  if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object'
     or char_length(trim(coalesce(p_shipping_address ->> 'fullName', ''))) not between 1 and 100
     or char_length(trim(coalesce(p_shipping_address ->> 'line1', ''))) not between 1 and 120
     or char_length(trim(coalesce(p_shipping_address ->> 'city', ''))) not between 1 and 80
     or char_length(trim(coalesce(p_shipping_address ->> 'state', ''))) not between 1 and 80
     or coalesce(p_shipping_address ->> 'postalCode', '') !~ '^[A-Za-z0-9 -]{3,10}$'
     or coalesce(p_shipping_address ->> 'country', '') !~ '^[A-Z]{2}$' then
    raise exception using message = 'validation', errcode = 'P0001';
  end if;

  -- 3. Lazy expiration (no pg_cron): cancel expired pending orders of anyone + the caller's current pending order.
  for v_pending in
    select id from vitrina.orders
    where status = 'pending_payment'
      and (created_at < now() - interval '30 minutes' or user_id = v_uid)
    order by id
    for update
  loop
    perform vitrina.cancel_pending_order(v_pending);
  end loop;

  -- 4. Lock the requested products (stable order avoids deadlocks).
  perform 1 from vitrina.products
  where id in (select (e ->> 'productId')::uuid from jsonb_array_elements(p_items) e)
  order by id
  for update;

  -- 5. Unknown or inactive products.
  select coalesce(array_agg(r.product_id), '{}') into v_bad
  from (select (e ->> 'productId')::uuid as product_id from jsonb_array_elements(p_items) e) r
  left join vitrina.products p on p.id = r.product_id
  where p.id is null or not p.is_active;
  if cardinality(v_bad) > 0 then
    raise exception using message = 'productUnavailable', errcode = 'P0001', detail = to_jsonb(v_bad)::text;
  end if;

  -- 6. Not enough stock.
  select coalesce(array_agg(p.id), '{}') into v_bad
  from (select (e ->> 'productId')::uuid as product_id, (e ->> 'quantity')::int as quantity
        from jsonb_array_elements(p_items) e) r
  join vitrina.products p on p.id = r.product_id
  where p.stock < r.quantity;
  if cardinality(v_bad) > 0 then
    raise exception using message = 'outOfStock', errcode = 'P0001', detail = to_jsonb(v_bad)::text;
  end if;

  -- 7. Totals with DATABASE prices (the client never sends prices).
  select sum(p.price_cents * r.quantity)::integer into v_subtotal
  from (select (e ->> 'productId')::uuid as product_id, (e ->> 'quantity')::int as quantity
        from jsonb_array_elements(p_items) e) r
  join vitrina.products p on p.id = r.product_id;

  -- 8. Reserve stock.
  update vitrina.products p set stock = p.stock - r.quantity
  from (select (e ->> 'productId')::uuid as product_id, (e ->> 'quantity')::int as quantity
        from jsonb_array_elements(p_items) e) r
  where p.id = r.product_id;

  -- 9. Insert the order and its frozen lines.
  insert into vitrina.orders (short_code, user_id, subtotal_cents, shipping_cents, total_cents, shipping_address)
  values (vitrina.generate_short_code(), v_uid, v_subtotal, vitrina.shipping_cents(v_subtotal),
          v_subtotal + vitrina.shipping_cents(v_subtotal), p_shipping_address)
  returning * into v_order;

  insert into vitrina.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
  select v_order.id, p.id, p.name, p.price_cents, r.quantity
  from (select (e ->> 'productId')::uuid as product_id, (e ->> 'quantity')::int as quantity
        from jsonb_array_elements(p_items) e) r
  join vitrina.products p on p.id = r.product_id;

  return v_order;
end $$;
```

### 5.4 Funciones de pago y de avance (solo `service_role`)

```sql
-- Stores the PaymentIntent id on a pending order (called by vitrina-create-payment-intent).
create function vitrina.attach_payment_intent(p_order_id uuid, p_payment_intent_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update vitrina.orders set stripe_payment_intent_id = p_payment_intent_id
  where id = p_order_id and status = 'pending_payment';
  if not found then
    raise exception using message = 'notFound', errcode = 'P0001';
  end if;
end $$;

-- Idempotent. pending_payment -> paid. Late payment on a canceled order: re-reserve stock or flag for refund.
create function vitrina.mark_order_paid(p_payment_intent_id text) returns vitrina.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order vitrina.orders;
begin
  select * into v_order from vitrina.orders where stripe_payment_intent_id = p_payment_intent_id for update;
  if not found then
    raise exception using message = 'notFound', errcode = 'P0001';
  end if;

  if v_order.status in ('paid', 'shipped', 'delivered') then
    return v_order;                                   -- already processed
  end if;

  if v_order.status = 'pending_payment' then
    update vitrina.orders set status = 'paid', last_payment_error = null where id = v_order.id returning * into v_order;
    return v_order;
  end if;

  -- canceled: lock the products, then try to take the stock again.
  perform 1 from vitrina.products
  where id in (select product_id from vitrina.order_items where order_id = v_order.id)
  order by id for update;

  if exists (
    select 1 from vitrina.order_items oi join vitrina.products p on p.id = oi.product_id
    where oi.order_id = v_order.id and (p.stock < oi.quantity or not p.is_active)
  ) then
    update vitrina.orders set needs_refund = true, last_payment_error = 'paid_after_cancel'
    where id = v_order.id returning * into v_order;
    return v_order;
  end if;

  update vitrina.products p set stock = p.stock - oi.quantity
  from vitrina.order_items oi where oi.order_id = v_order.id and oi.product_id = p.id;
  update vitrina.orders set status = 'paid', needs_refund = false, last_payment_error = null
  where id = v_order.id returning * into v_order;
  return v_order;
end $$;

create function vitrina.record_payment_failure(p_payment_intent_id text, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update vitrina.orders set last_payment_error = left(coalesce(p_message, 'payment_failed'), 500)
  where stripe_payment_intent_id = p_payment_intent_id;
end $$;

-- Demo helper: paid -> shipped -> delivered (the trigger validates the transition).
create function vitrina.advance_order_status(p_order_id uuid, p_status vitrina.order_status) returns vitrina.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order vitrina.orders;
begin
  if p_status not in ('shipped', 'delivered') then
    raise exception using message = 'INVALID_TRANSITION', errcode = 'P0001';
  end if;
  update vitrina.orders set status = p_status where id = p_order_id returning * into v_order;
  if not found then
    raise exception using message = 'notFound', errcode = 'P0001';
  end if;
  return v_order;
end $$;
```

### 5.5 Permisos de ejecución

```sql
revoke execute on all functions in schema vitrina from public, anon, authenticated;
grant execute on function vitrina.ensure_profile() to authenticated;
grant execute on function vitrina.create_order(jsonb, jsonb) to authenticated;
grant execute on function vitrina.attach_payment_intent(uuid, text) to service_role;
grant execute on function vitrina.mark_order_paid(text) to service_role;
grant execute on function vitrina.record_payment_failure(text, text) to service_role;
grant execute on function vitrina.advance_order_status(uuid, vitrina.order_status) to service_role;
```

(`cancel_pending_order`, `generate_short_code` y `shipping_cents` quedan sin `grant`: solo se llaman desde otras
funciones `security definer`, que se ejecutan como su propietario.)

## Paso 6 · Migración 4: Realtime y Storage (`20261005000400_vitrina_realtime_storage.sql`)

```sql
create schema if not exists vitrina;

-- Realtime: only orders change live during the MVP (definición §7.5). Respects RLS.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'vitrina' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table vitrina.orders;
  end if;
end $$;

-- Public product images. Bucket names are global to the shared project -> "vitrina-" prefix.
-- Public read via public URLs; no write policies for anon/authenticated (uploads use the secret key).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vitrina-products', 'vitrina-products', true, 204800, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;
```

## Paso 7 · Script de avance de pedidos (`supabase/scripts/advance-order.sql`)

```sql
-- Usage (local):  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--                   -v code=VT-7K3Q -v status=shipped -f supabase/scripts/advance-order.sql
-- Usage (remote): psql "$SUPABASE_DB_URL" -v code=… -v status=… -f supabase/scripts/advance-order.sql
select id, short_code, status, shipped_at, delivered_at
from vitrina.advance_order_status(
  (select id from vitrina.orders where short_code = :'code'),
  :'status'::vitrina.order_status
);
```

Añade al `package.json`: `"db:advance": "psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/scripts/advance-order.sql"`
(uso: `npm run db:advance -- -v code=VT-XXXX -v status=shipped`).

## Paso 8 · Aplicar y revisar

```bash
supabase db reset          # aplica las 4 migraciones + seed.sql
```

Comprueba en Studio (`http://127.0.0.1:54323`) o con `psql`: 5 categorías, 30 productos, RLS activo en las 6 tablas,
bucket `vitrina-products` público, `vitrina.orders` en la publicación `supabase_realtime`.

## Paso 9 · Tests pgTAP (`supabase/tests/vitrina.test.sql`)

Estructura (referencia: Agendo `supabase/tests/agendo.test.sql`):

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);   -- adjust to the real number

-- Test users (rolled back). auth.users is shared in remote, but this runs only locally inside a transaction.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-00000000a001', 'alice@test.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000b001', 'bob@test.dev', 'authenticated', 'authenticated');

-- Test products with exact prices for the shipping threshold (rolled back).
insert into vitrina.products (id, slug, name, price_cents, category_id, stock) values
  ('00000000-0000-4000-8000-00000000f001', 't-4999', 'Test 49.99', 4999, '00000000-0000-4000-8000-000000000101', 5),
  ('00000000-0000-4000-8000-00000000f002', 't-5000', 'Test 50.00', 5000, '00000000-0000-4000-8000-000000000101', 5);
-- … tests …
select * from finish();
rollback;
```

Para actuar como un usuario (usa `set_config`; es más robusto que `set local … to '<json>'`):

```sql
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);
-- … queries as Alice …
reset role;
```

Como `anon`: `set local role anon; select set_config('request.jwt.claims', '{"role":"anon"}', true);`.
Como `service_role`: `set local role service_role;`.

**Casos mínimos** (uno o más asserts cada uno):

1. Las 6 tablas existen (`has_table`) y **ninguna** tiene RLS desactivado (`pg_tables.rowsecurity`).
2. Cada política de `vitrina` tiene comentario (`obj_description(pol.oid, 'pg_policy') is not null` para todas).
3. `anon` ve 30 productos; un producto con `is_active = false` no es visible para `anon`.
4. `anon` no puede leer `orders` (`throws_ok … '42501'`) ni ejecutar `create_order` (`42501`).
5. Alice `create_order` con 1 × `t-4999` → `subtotal 4999`, `shipping 499`, `total 5498`, `status pending_payment`,
   `short_code ~ '^VT-[2-9A-HJ-NP-Z]{4}$'`.
6. Alice `create_order` con 1 × `t-5000` → `shipping 0`, `total 5000`; **el pedido anterior de Alice queda `canceled`**
   y su stock de `t-4999` vuelve a 5.
7. `create_order` ignora un precio enviado por el cliente (`{"productId": …, "quantity": 1, "priceCents": 1}`) → cobra el de la BD.
8. El stock se descuenta (`t-5000` pasa de 5 a 4).
9. Cantidad mayor que el stock → `throws_ok(…, 'P0001', 'outOfStock')`; el `detail` contiene el id.
10. Producto inactivo o inexistente → `productUnavailable`.
11. `validation`: array vacío, 21 líneas, cantidad 11, cantidad 1.5, id duplicado, dirección sin `line1`, país `us`.
12. Pedido `pending_payment` de Bob con `created_at` de hace 31 min (actualízalo como `postgres`) → cuando Alice crea
    un pedido, el de Bob pasa a `canceled` y su stock se restaura.
13. Bob no ve pedidos ni líneas de Alice (`count = 0`).
14. Alice no puede `update vitrina.orders set status = 'paid'` (`42501`) ni `insert` en `orders`/`order_items`/`profiles` (`42501`).
15. Alice no puede `update` el perfil de Bob (0 filas afectadas) ni cambiar su propio `id` (`42501`).
16. `ensure_profile()` dos veces → una sola fila; `anon` no puede ejecutarla.
17. `authenticated` no puede ejecutar `mark_order_paid` ni `advance_order_status` (`42501`).
18. Como `service_role`: `attach_payment_intent` + `mark_order_paid('pi_test_1')` → `paid`, `paid_at` no nulo;
    segunda llamada → sigue `paid` y `paid_at` no cambia.
19. `advance_order_status(paid → delivered)` → `INVALID_TRANSITION`; `paid → shipped → delivered` rellena `shipped_at` y `delivered_at`.
20. Update directo como `postgres` de `delivered → pending_payment` → `INVALID_TRANSITION` (el trigger protege también de Studio).
21. Pago tardío con stock: pedido `canceled` con PI → `mark_order_paid` lo deja `paid`, `canceled_at` nulo y descuenta stock.
22. Pago tardío sin stock → sigue `canceled`, `needs_refund = true`, `last_payment_error = 'paid_after_cancel'`.
23. Insertar como `postgres` un pedido con `total ≠ subtotal + shipping` → `23514`.
24. `vitrina.shipping_cents(4999) = 499` y `vitrina.shipping_cents(5000) = 0` (mismos casos que `calculateCartTotals`).

```bash
supabase db reset && supabase test db
```

## Paso 10 · Tipos generados

```bash
supabase gen types typescript --local --schema vitrina > src/core/supabase/database.generated.ts
```

- Script: `"db:types": "supabase gen types typescript --local --schema vitrina > src/core/supabase/database.generated.ts"`.
- Ya está en los `ignores` de ESLint (fase 01) y Prettier ignora `*.generated.ts`.
- Tipa el cliente: `createClient<Database, 'vitrina'>(…)` (revisa los genéricos de la versión instalada; Agendo usa
  exactamente esa forma) y exporta `VitrinaSupabaseClient`.
- Commitea el archivo generado (el CI no tiene Docker).

## Paso 11 · `.env` local y prueba rápida

- `supabase status` muestra la URL y la publishable key local. En tu `.env` (no commiteado): URL
  `http://10.0.2.2:54321` (emulador) y la publishable key. Mantén `EXPO_PUBLIC_FORCE_DEMO=true` hasta la fase 06.
  Como `isBackendConfigured` también exige la clave de Stripe, a partir de la fase 06 se usa el marcador
  `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder` hasta tener la clave real (fase 11).
- Documenta en `.env.example` (comentario) lo de `10.0.2.2` para emulador y la IP LAN para un teléfono físico.
- Prueba rápida de la API como `anon`:
  `curl -s "http://127.0.0.1:54321/rest/v1/products?select=name&name=ilike.*mug*" -H "apikey: <publishable>" -H "Accept-Profile: vitrina"`
  → 3 productos.
- Prueba del OTP: `curl -s -X POST "http://127.0.0.1:54321/auth/v1/otp" -H "apikey: <publishable>" -H "Content-Type: application/json" -d '{"email":"shopper@vitrina.dev","create_user":true}'`
  → el correo con un código de 6 dígitos aparece en Mailpit (`http://127.0.0.1:54324`). Anota el resultado.

## Paso 12 · Cierre

`00-guia-general.md` §3.3, incluyendo `supabase db reset && supabase test db`.

---

## Criterios de terminado

- [ ] 4 migraciones con los nombres de la definición §7.6 que solo tocan `vitrina` (+ publicación Realtime y bucket `vitrina-products`).
- [ ] RLS activo en las 6 tablas; cada política con `comment on policy`; sin escritura de clientes en `products`, `orders`, `order_items` ni insert en `profiles`.
- [ ] Todas las funciones con `search_path = ''`; `execute` revocado a `public`/`anon`/`authenticated` y concedido solo al rol indicado.
- [ ] `catalog.json` con los 30 productos y 5 categorías exactos de este archivo; `seed.sql` generado por script.
- [ ] `supabase db reset` y `supabase test db` en verde (≥ 30 asserts cubriendo los 24 casos).
- [ ] Tipos generados y cliente tipado con el schema `vitrina`; `advance-order.sql` probado a mano.
- [ ] OTP local probado (correo en Mailpit) y búsqueda "mug" por API → 3 productos.
- [ ] lint/typecheck/format/test en verde; PR mergeado; bitácora actualizada.
