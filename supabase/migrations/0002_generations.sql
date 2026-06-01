-- Phase 3: generations ledger. One row per restyle/refine job.
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  original_url text,
  result_url text,
  style text,
  note text,
  budget text,
  prompt text,
  parent_id uuid references public.generations(id),
  status text not null default 'done',
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

-- Users can read their own generations. Inserts happen server-side via the
-- service-role admin client (which bypasses RLS), so no insert policy is needed.
drop policy if exists "own generations read" on public.generations;
create policy "own generations read" on public.generations
  for select using (auth.uid() = user_id);

create index if not exists generations_user_id_idx on public.generations(user_id);
create index if not exists generations_parent_id_idx on public.generations(parent_id);
