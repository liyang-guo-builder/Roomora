-- Roomora — Stripe credit purchases (server-authoritative via webhook).
-- add_credits_for() credits an ARBITRARY user id (called by the service role
-- from the Stripe webhook, where there is no auth.uid()). stripe_payments is
-- the idempotency ledger; its unique session id guards against double-credits.

-- Credit a specific user (not auth.uid()). SECURITY DEFINER so it can write to
-- profiles; granted to service_role only (the webhook runs as service role).
create or replace function public.add_credits_for(p_user_id uuid, p_amount int, p_reason text) returns int
language plpgsql security definer set search_path = public as $$
declare newbal int; begin
  update public.profiles set credits = credits + p_amount where id = p_user_id returning credits into newbal;
  if newbal is null then raise exception 'no profile for %', p_user_id; end if;
  insert into public.credit_transactions (user_id, delta, reason) values (p_user_id, p_amount, p_reason);
  return newbal;
end; $$;

-- Lock this down hard: Postgres grants EXECUTE to PUBLIC by default, which
-- would let any signed-in (or anon) user credit an arbitrary account. Revoke
-- from everyone, then grant ONLY to service_role (the webhook admin client).
revoke execute on function public.add_credits_for(uuid,int,text) from public;
revoke execute on function public.add_credits_for(uuid,int,text) from anon;
revoke execute on function public.add_credits_for(uuid,int,text) from authenticated;
grant execute on function public.add_credits_for(uuid,int,text) to service_role;

-- Payment ledger. The unique stripe_session_id is the idempotency key.
create table if not exists public.stripe_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  stripe_session_id text unique not null,
  pack_index int,
  credits int,
  amount_eur numeric,
  status text,
  created_at timestamptz not null default now()
);

alter table public.stripe_payments enable row level security;

-- Owners can read their own payment rows. The service role bypasses RLS for
-- writes (insert/update happen from the webhook via the admin client).
drop policy if exists "own payment read" on public.stripe_payments;
create policy "own payment read" on public.stripe_payments for select using (auth.uid() = user_id);
