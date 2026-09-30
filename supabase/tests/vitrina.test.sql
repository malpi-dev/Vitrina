-- pgTAP tests for the vitrina schema. Run with: supabase db reset && supabase test db
-- Everything runs inside a transaction that is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(82);

-- ---------------------------------------------------------------------------
-- Fixtures (rolled back). auth.users is shared in remote; this only runs locally.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-00000000a001', 'alice@test.dev', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000b001', 'bob@test.dev', 'authenticated', 'authenticated');

-- Products with exact prices for the shipping threshold, plus an inactive one.
insert into vitrina.products (id, slug, name, price_cents, category_id, stock, is_active) values
  ('00000000-0000-4000-8000-00000000f001', 't-4999', 'Test 49.99', 4999, '00000000-0000-4000-8000-000000000101', 5, true),
  ('00000000-0000-4000-8000-00000000f002', 't-5000', 'Test 50.00', 5000, '00000000-0000-4000-8000-000000000101', 5, true),
  ('00000000-0000-4000-8000-00000000f003', 't-off', 'Test inactive', 1000, '00000000-0000-4000-8000-000000000101', 5, false);

-- Helper: returns the exception detail raised by a statement (or null).
create function pg_temp.error_detail(p_sql text) returns text language plpgsql as $$
declare v_detail text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_detail = pg_exception_detail;
  return v_detail;
end $$;

-- Helper: valid shipping address.
create function pg_temp.address() returns jsonb language sql as $$
  select '{"fullName":"Ada Lovelace","line1":"1 Main St","city":"Austin","state":"TX","postalCode":"78701","country":"US"}'::jsonb
$$;

-- ---------------------------------------------------------------------------
-- 1. Tables and RLS
-- ---------------------------------------------------------------------------
select has_table('vitrina', 'profiles', 'profiles exists');
select has_table('vitrina', 'categories', 'categories exists');
select has_table('vitrina', 'products', 'products exists');
select has_table('vitrina', 'orders', 'orders exists');
select has_table('vitrina', 'order_items', 'order_items exists');
select has_table('vitrina', 'stripe_events', 'stripe_events exists');
select is(
  (select count(*) from pg_tables where schemaname = 'vitrina' and not rowsecurity),
  0::bigint, 'RLS is enabled on every vitrina table');

-- 2. Every policy has a comment
select is(
  (select count(*) from pg_policy pol join pg_class c on c.oid = pol.polrelid
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'vitrina' and obj_description(pol.oid, 'pg_policy') is null),
  0::bigint, 'every vitrina policy has a comment');

-- Realtime and storage
select is(
  (select count(*) from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'vitrina' and tablename = 'orders'),
  1::bigint, 'orders is in the supabase_realtime publication');
select is(
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'vitrina'),
  1::bigint, 'only orders is published');
select is(
  (select public from storage.buckets where id = 'vitrina-products'),
  true, 'vitrina-products bucket exists and is public');

-- ---------------------------------------------------------------------------
-- 3-4. Anonymous access
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*) from vitrina.products where slug not like 't-%'), 30::bigint, 'anon sees the 30 seeded products');
select is((select count(*) from vitrina.products where slug = 't-off'), 0::bigint, 'anon does not see inactive products');
select is((select count(*) from vitrina.categories), 5::bigint, 'anon sees the 5 categories');
select throws_ok('select * from vitrina.orders', '42501', null, 'anon cannot read orders');
select throws_ok(
  $$select vitrina.create_order('[]'::jsonb, '{}'::jsonb)$$, '42501', null, 'anon cannot run create_order');
select throws_ok('select vitrina.ensure_profile()', '42501', null, 'anon cannot run ensure_profile');
reset role;

-- Shared ordering: newest first, ties broken by id ascending (same rule as compareProducts in the domain).
select is(
  (select array_agg(slug order by created_at desc, id asc)
   from vitrina.products where slug in ('t-4999', 't-5000')),
  array['t-4999', 't-5000'],
  'order by created_at desc, id asc is deterministic when created_at ties');

-- ---------------------------------------------------------------------------
-- 5-8. create_order as Alice
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);

create temp table r5 as
  select * from vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f001","quantity":1}]'::jsonb, pg_temp.address());
select is((select subtotal_cents from r5), 4999, 'subtotal for $49.99');
select is((select shipping_cents from r5), 499, 'shipping $4.99 below $50.00');
select is((select total_cents from r5), 5498, 'total = subtotal + shipping');
select is((select status::text from r5), 'pending_payment', 'new order is pending_payment');
select matches((select short_code from r5), '^VT-[2-9A-HJ-NP-Z]{4}$', 'short code format');

-- Sends a client price (ignored) and replaces the previous pending order.
create temp table r6 as
  select * from vitrina.create_order(
    '[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":1,"priceCents":1}]'::jsonb, pg_temp.address());
select is((select shipping_cents from r6), 0, 'free shipping at exactly $50.00');
select is((select total_cents from r6), 5000, 'the database price is charged, not the client price');
reset role;
select is((select status::text from vitrina.orders where id = (select id from r5)), 'canceled', 'the previous pending order was canceled');
select is((select stock from vitrina.products where slug = 't-4999'), 5, 'canceled order gave its stock back');
select is((select stock from vitrina.products where slug = 't-5000'), 4, 'stock is reserved on create_order');
select is((select count(*) from vitrina.order_items where order_id = (select id from r6) and unit_price_cents = 5000 and product_name = 'Test 50.00'),
  1::bigint, 'order lines freeze name and price');

-- ---------------------------------------------------------------------------
-- 9-11. Errors (each call is rolled back by throws_ok)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":6}]', pg_temp.address())$$,
  'P0001', 'outOfStock', 'quantity above stock (even after the lazy cancel) -> outOfStock');
select ok(
  pg_temp.error_detail($$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":6}]', pg_temp.address())$$)
    like '%00000000-0000-4000-8000-00000000f002%',
  'outOfStock detail lists the product id');
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f003","quantity":1}]', pg_temp.address())$$,
  'P0001', 'productUnavailable', 'inactive product -> productUnavailable');
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-0000000000ff","quantity":1}]', pg_temp.address())$$,
  'P0001', 'productUnavailable', 'unknown product -> productUnavailable');
select throws_ok(
  $$select vitrina.create_order('[]', pg_temp.address())$$, 'P0001', 'validation', 'empty items -> validation');
select throws_ok(
  $$select vitrina.create_order((select jsonb_agg(jsonb_build_object('productId', gen_random_uuid(), 'quantity', 1)) from generate_series(1, 21)), pg_temp.address())$$,
  'P0001', 'validation', '21 lines -> validation');
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":11}]', pg_temp.address())$$,
  'P0001', 'validation', 'quantity 11 -> validation');
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":1.5}]', pg_temp.address())$$,
  'P0001', 'validation', 'quantity 1.5 -> validation');
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":1},{"productId":"00000000-0000-4000-8000-00000000f002","quantity":2}]', pg_temp.address())$$,
  'P0001', 'validation', 'duplicated product -> validation');
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":1}]', pg_temp.address() - 'line1')$$,
  'P0001', 'validation', 'address without line1 -> validation');
select throws_ok(
  $$select vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":1}]', pg_temp.address() || '{"country":"us"}')$$,
  'P0001', 'validation', 'lowercase country -> validation');
reset role;

-- ---------------------------------------------------------------------------
-- 12. Lazy expiration of other users' pending orders
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated"}', true);
create temp table rbob as
  select * from vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f001","quantity":1}]'::jsonb, pg_temp.address());
reset role;
select is((select stock from vitrina.products where slug = 't-4999'), 4, 'Bob reserved stock');
update vitrina.orders set created_at = now() - interval '31 minutes' where id = (select id from rbob);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);
create temp table r12 as
  select * from vitrina.create_order('[{"productId":"00000000-0000-4000-8000-00000000f002","quantity":1}]'::jsonb, pg_temp.address());
grant select on r12 to public;  -- later read while acting as service_role
reset role;
select is((select status::text from vitrina.orders where id = (select id from rbob)), 'canceled', 'an expired pending order is canceled by another checkout');
select is((select stock from vitrina.products where slug = 't-4999'), 5, 'expired order gave its stock back');

-- ---------------------------------------------------------------------------
-- 13-17. RLS and privileges
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated"}', true);
select is((select count(*) from vitrina.orders where user_id = '00000000-0000-4000-8000-00000000a001'), 0::bigint, 'Bob does not see Alice orders');
select is((select count(*) from vitrina.order_items), 1::bigint, 'Bob only sees the lines of his own order');
select is((select count(*) from vitrina.orders), 1::bigint, 'Bob only sees his own order');
select is((vitrina.ensure_profile()).id, '00000000-0000-4000-8000-00000000b001'::uuid, 'Bob ensure_profile creates his profile');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);
select throws_ok($$update vitrina.orders set status = 'paid'$$, '42501', null, 'clients cannot update orders');
select throws_ok($$delete from vitrina.orders$$, '42501', null, 'clients cannot delete orders');
select throws_ok(
  $$insert into vitrina.orders (short_code, user_id, subtotal_cents, shipping_cents, total_cents, shipping_address)
    values ('VT-HACK', '00000000-0000-4000-8000-00000000a001', 1, 0, 1, '{}')$$,
  '42501', null, 'clients cannot insert orders');
select throws_ok(
  $$insert into vitrina.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
    values (gen_random_uuid(), '00000000-0000-4000-8000-00000000f001', 'x', 1, 1)$$,
  '42501', null, 'clients cannot insert order lines');
select throws_ok(
  $$insert into vitrina.profiles (id) values ('00000000-0000-4000-8000-00000000a001')$$,
  '42501', null, 'clients cannot insert profiles');
select throws_ok($$update vitrina.products set price_cents = 1$$, '42501', null, 'clients cannot change product prices');
select throws_ok($$select * from vitrina.stripe_events$$, '42501', null, 'clients cannot read stripe_events');

select is((vitrina.ensure_profile()).id, '00000000-0000-4000-8000-00000000a001'::uuid, 'Alice ensure_profile');
select lives_ok($$select vitrina.ensure_profile()$$, 'ensure_profile is idempotent');
select lives_ok($$update vitrina.profiles set full_name = 'Alice' where id = '00000000-0000-4000-8000-00000000a001'$$, 'Alice edits her own profile');
select lives_ok($$update vitrina.profiles set full_name = 'Hacked' where id = '00000000-0000-4000-8000-00000000b001'$$, 'updating another profile does not fail...');
select throws_ok($$update vitrina.profiles set id = gen_random_uuid()$$, '42501', null, 'the profile id cannot be changed');
select throws_ok($$select vitrina.mark_order_paid('pi_x')$$, '42501', null, 'authenticated cannot run mark_order_paid');
select throws_ok(
  $$select vitrina.advance_order_status(gen_random_uuid(), 'shipped')$$, '42501', null, 'authenticated cannot run advance_order_status');
reset role;
select is((select count(*) from vitrina.profiles where id in ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000b001')),
  2::bigint, 'one profile per user after repeated ensure_profile');
select is((select full_name from vitrina.profiles where id = '00000000-0000-4000-8000-00000000b001'), null,
  '... and it touched 0 rows of Bob profile');

-- ---------------------------------------------------------------------------
-- 18-20. Payments and status machine (service_role)
-- ---------------------------------------------------------------------------
set local role service_role;
select lives_ok(
  format($$select vitrina.attach_payment_intent(%L, 'pi_test_1')$$, (select id from r12)), 'service_role attaches a payment intent');
select is((select status::text from vitrina.mark_order_paid('pi_test_1')), 'paid', 'mark_order_paid -> paid');
reset role;
select isnt((select paid_at from vitrina.orders where id = (select id from r12)), null, 'paid_at is stamped');
create temp table paid_at_1 as select paid_at from vitrina.orders where id = (select id from r12);
set local role service_role;
select is((select status::text from vitrina.mark_order_paid('pi_test_1')), 'paid', 'mark_order_paid is idempotent');
reset role;
select is((select paid_at from vitrina.orders where id = (select id from r12)), (select paid_at from paid_at_1), 'paid_at does not change on replay');

set local role service_role;
select throws_ok(
  format($$select vitrina.advance_order_status(%L, 'delivered')$$, (select id from r12)), 'P0001', 'INVALID_TRANSITION', 'paid -> delivered is rejected');
select lives_ok(format($$select vitrina.advance_order_status(%L, 'shipped')$$, (select id from r12)), 'paid -> shipped');
select lives_ok(format($$select vitrina.advance_order_status(%L, 'delivered')$$, (select id from r12)), 'shipped -> delivered');
select lives_ok($$select vitrina.record_payment_failure('pi_test_1', 'card_declined')$$, 'record_payment_failure works');
reset role;
select ok(
  (select shipped_at is not null and delivered_at is not null from vitrina.orders where id = (select id from r12)),
  'shipped_at and delivered_at are stamped');
select throws_ok(
  format($$update vitrina.orders set status = 'pending_payment' where id = %L$$, (select id from r12)),
  'P0001', 'INVALID_TRANSITION', 'the trigger also protects direct updates');

-- ---------------------------------------------------------------------------
-- 21-22. Late payments on canceled orders
-- ---------------------------------------------------------------------------
-- With stock: a canceled order whose lines can be reserved again.
insert into vitrina.orders (id, short_code, user_id, status, subtotal_cents, shipping_cents, total_cents, shipping_address, stripe_payment_intent_id, canceled_at)
values ('00000000-0000-4000-8000-00000000c001', 'VT-LATE', '00000000-0000-4000-8000-00000000b001', 'canceled', 4999, 499, 5498, pg_temp.address(), 'pi_late_ok', now());
insert into vitrina.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
values ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000f001', 'Test 49.99', 4999, 2);
set local role service_role;
select is((select status::text from vitrina.mark_order_paid('pi_late_ok')), 'paid', 'late payment with stock -> paid');
reset role;
select is((select canceled_at from vitrina.orders where id = '00000000-0000-4000-8000-00000000c001'), null, 'canceled_at is cleared');
select is((select stock from vitrina.products where slug = 't-4999'), 3, 'late payment takes the stock again');

-- Without stock: flagged for a manual refund.
insert into vitrina.orders (id, short_code, user_id, status, subtotal_cents, shipping_cents, total_cents, shipping_address, stripe_payment_intent_id, canceled_at)
values ('00000000-0000-4000-8000-00000000c002', 'VT-NOST', '00000000-0000-4000-8000-00000000b001', 'canceled', 4999, 499, 5498, pg_temp.address(), 'pi_late_no', now());
insert into vitrina.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
values ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000f001', 'Test 49.99', 4999, 4);
set local role service_role;
select lives_ok($$select vitrina.mark_order_paid('pi_late_no')$$, 'late payment without stock does not fail');
reset role;
select is(
  (select status::text || '/' || needs_refund::text || '/' || last_payment_error from vitrina.orders where id = '00000000-0000-4000-8000-00000000c002'),
  'canceled/true/paid_after_cancel', 'late payment without stock stays canceled and needs a refund');

-- ---------------------------------------------------------------------------
-- 23-24. Constraints and shipping rule
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into vitrina.orders (short_code, user_id, subtotal_cents, shipping_cents, total_cents, shipping_address)
    values ('VT-BAD1', '00000000-0000-4000-8000-00000000a001', 1000, 499, 1000, '{}')$$,
  '23514', null, 'total must equal subtotal + shipping');
select is(vitrina.shipping_cents(4999), 499, 'shipping_cents(4999) = 499');
select is(vitrina.shipping_cents(5000), 0, 'shipping_cents(5000) = 0');

select * from finish();
rollback;
