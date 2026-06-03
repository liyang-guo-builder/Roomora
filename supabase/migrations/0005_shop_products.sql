-- Phase 5: "Shop this look" — affiliate product catalog + itemization cache.
-- products is public catalog data (Awin feed). No RLS: it is read only via the
-- service-role admin client server-side (never directly from the browser).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  advertiser text,
  external_id text,
  title text,
  description text,
  category text,
  price numeric,
  currency text default 'EUR',
  image_url text,
  deeplink text,
  brand text,
  in_stock boolean default true,
  updated_at timestamptz default now(),
  unique (advertiser, external_id)
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_price_idx on public.products (price);
create index if not exists products_fts_idx on public.products
  using gin (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  );

-- Cache the itemization (array of {category, query, color, material}) on the
-- generation row so we only call the vision itemizer once per design.
alter table public.generations add column if not exists items jsonb;

-- Server-side product matcher for "Shop this look".
-- Builds an OR full-text query from the search phrase words (so a precise phrase
-- like "light grey 2-seater sofa" still matches a "Sofa, Cream" listing on the
-- shared words) and ranks by ts_rank relevance — the more query words a product
-- hits, the higher it ranks — then by price ascending.
-- Tries an exact category match first; if none, the caller falls back to any
-- category so a relevant cross-category match still surfaces.
-- p_max_price null = no cap. SECURITY DEFINER + revoked from anon/authenticated
-- so it is only callable via the service-role admin client server-side.
create or replace function public.search_products(
  p_category text,
  p_query text,
  p_max_price numeric,
  p_limit int default 5
)
returns setof public.products
language sql
stable
security definer
set search_path = public
as $$
  with terms as (
    -- Lexemes from the search phrase (handles stop words / normalization).
    select array_agg(lexeme) as lx
    from unnest(
      to_tsvector('simple', coalesce(p_query, ''))
    ) as v(lexeme, positions, weights)
  ),
  q as (
    select case
      when lx is null or array_length(lx, 1) is null then null
      else to_tsquery('simple', array_to_string(lx, ' | '))
    end as tsq
    from terms
  )
  select p.*
  from public.products p, q
  where p.in_stock
    and (p_max_price is null or p.price <= p_max_price)
    and (p_category is null or p.category = p_category)
    and (
      q.tsq is null
      or to_tsvector('simple', coalesce(p.title, '') || ' ' || coalesce(p.description, '')) @@ q.tsq
    )
  order by
    ts_rank(
      to_tsvector('simple', coalesce(p.title, '') || ' ' || coalesce(p.description, '')),
      coalesce(q.tsq, plainto_tsquery('simple', ''))
    ) desc,
    p.price asc nulls last
  limit greatest(coalesce(p_limit, 5), 1);
$$;

revoke all on function public.search_products(text, text, numeric, int) from anon, authenticated;
