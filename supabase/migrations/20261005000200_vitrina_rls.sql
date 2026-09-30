-- Row Level Security for every vitrina table. Each policy has a SQL comment and a comment on policy.
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
