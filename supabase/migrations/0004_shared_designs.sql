-- GTM: public Share pages. A shared design is a generations row flagged
-- shared=true. The /share/[id] page reads it via the service-role admin client
-- (bypasses RLS), and only rows with shared=true are publicly viewable.
-- Sharing is opt-in: a row becomes shared only when the user taps Share.

alter table public.generations
  add column if not exists shared boolean not null default false;

-- Fast lookup of shared rows.
create index if not exists generations_shared_idx
  on public.generations (shared)
  where shared = true;
