-- Advances an order for demos (paid -> shipped -> delivered).
-- Usage (local):  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--                   -v code=VT-7K3Q -v status=shipped -f supabase/scripts/advance-order.sql
-- Usage (remote): psql "$SUPABASE_DB_URL" -v code=... -v status=... -f supabase/scripts/advance-order.sql
select id, short_code, status, shipped_at, delivered_at
from vitrina.advance_order_status(
  (select id from vitrina.orders where short_code = :'code'),
  :'status'::vitrina.order_status
);
