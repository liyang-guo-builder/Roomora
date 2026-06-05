-- Server-enforced anonymous free-trial ledger.
-- One row per successful anonymous generation. Used by /api/generate to cap
-- anonymous (signed-out) usage by device cookie + IP. Best-effort anti-abuse:
-- clearing cookies / incognito / a new IP can still reset it. The goal is
-- stopping casual replay of the free trial, not perfect enforcement.
-- Only the service-role admin client touches this table (it bypasses RLS).

create table if not exists public.anon_trials (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists anon_trials_device_id_idx on public.anon_trials (device_id);
create index if not exists anon_trials_ip_idx on public.anon_trials (ip);
create index if not exists anon_trials_created_at_idx on public.anon_trials (created_at);

-- RLS on with NO public policies: anon/authenticated roles get zero access.
-- The service-role admin client bypasses RLS, so the route can still read/write.
alter table public.anon_trials enable row level security;
