-- Vitrina schema: enum, tables, indexes and grants. RLS lives in the next migration.
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
  needs_refund boolean not null default false,   -- late payment that could not be fulfilled
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
  product_name text not null,                                     -- frozen at purchase time
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
