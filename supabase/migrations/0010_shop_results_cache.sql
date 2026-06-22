-- Roomora — cache live "Shop this look" search results per design, so we never
-- re-spend SearchApi credits for the same generation + item. Keyed by the item's
-- index in generations.items: { "0": { products: [...], at: "<iso>" }, ... }.
-- Written only by the service-role admin client (server-side); no RLS policy
-- needed beyond the existing owner-read on generations.
alter table public.generations add column if not exists shop_results jsonb;
