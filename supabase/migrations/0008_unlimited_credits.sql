-- Master / owner accounts: an "unlimited" flag so the owner (and any comped
-- account) can use the app freely without burning credits. When a profile is
-- marked unlimited, spend_credits never deducts and never blocks; it logs a
-- zero-delta usage row for traceability and returns the (high) balance so the
-- UI shows plenty. Everyone else is unchanged.

alter table public.profiles
  add column if not exists unlimited boolean not null default false;

create or replace function public.spend_credits(p_amount int, p_reason text) returns int
language plpgsql security definer set search_path = public as $$
declare cur int; unl boolean; begin
  select credits, unlimited into cur, unl from public.profiles where id = auth.uid() for update;
  if cur is null then raise exception 'no profile'; end if;
  if unl then
    -- Unlimited account: do not deduct, never raise insufficient. Log a 0-delta
    -- row so usage is still visible in credit_transactions.
    insert into public.credit_transactions (user_id, delta, reason)
      values (auth.uid(), 0, p_reason || '_unlimited');
    return cur;
  end if;
  if cur < p_amount then raise exception 'insufficient credits'; end if;
  update public.profiles set credits = credits - p_amount where id = auth.uid();
  insert into public.credit_transactions (user_id, delta, reason)
    values (auth.uid(), -p_amount, p_reason);
  return cur - p_amount;
end; $$;

grant execute on function public.spend_credits(int,text) to authenticated;
