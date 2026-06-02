-- Phase 4: Save / My Designs. Reuses the existing generations table — a saved
-- design is just a generations row flagged saved=true. No new table.

alter table public.generations
  add column if not exists saved boolean not null default false;

-- Fast "my saved designs, newest first" lookups.
create index if not exists generations_saved_idx
  on public.generations (user_id, saved, created_at desc);

-- Let users UPDATE their own rows (e.g. flip saved) under RLS. Server-side
-- saves go through the service-role admin client (bypasses RLS), but this also
-- supports the anon→sign-in claim path and any direct client update.
drop policy if exists "own gen update" on public.generations;
create policy "own gen update" on public.generations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
