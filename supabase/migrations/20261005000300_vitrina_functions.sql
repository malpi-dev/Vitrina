-- Triggers and RPCs. Every function uses set search_path = '' and qualified names.
-- Business errors: raise exception using message = '<code>', errcode = 'P0001' (mapped by mapSupabaseError).
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

-- Only the intended role can execute each function (service_role keeps no implicit access either).
revoke execute on all functions in schema vitrina from public, anon, authenticated, service_role;
grant execute on function vitrina.ensure_profile() to authenticated;
grant execute on function vitrina.create_order(jsonb, jsonb) to authenticated;
grant execute on function vitrina.attach_payment_intent(uuid, text) to service_role;
grant execute on function vitrina.mark_order_paid(text) to service_role;
grant execute on function vitrina.record_payment_failure(text, text) to service_role;
grant execute on function vitrina.advance_order_status(uuid, vitrina.order_status) to service_role;
