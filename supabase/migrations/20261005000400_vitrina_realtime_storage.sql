-- Realtime publication and the public product images bucket.
create schema if not exists vitrina;

-- Realtime: only orders change live during the MVP. Respects RLS.
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
