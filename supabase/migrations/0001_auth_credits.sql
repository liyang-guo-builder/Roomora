create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 3,
  lang text not null default 'en',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.credit_transactions enable row level security;
drop policy if exists "own tx read" on public.credit_transactions;
create policy "own tx read" on public.credit_transactions for select using (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, credits) values (new.id, 3) on conflict (id) do nothing;
  insert into public.credit_transactions (user_id, delta, reason) values (new.id, 3, 'signup_grant');
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.spend_credits(p_amount int, p_reason text) returns int
language plpgsql security definer set search_path = public as $$
declare cur int; begin
  select credits into cur from public.profiles where id = auth.uid() for update;
  if cur is null then raise exception 'no profile'; end if;
  if cur < p_amount then raise exception 'insufficient credits'; end if;
  update public.profiles set credits = credits - p_amount where id = auth.uid();
  insert into public.credit_transactions (user_id, delta, reason) values (auth.uid(), -p_amount, p_reason);
  return cur - p_amount;
end; $$;

create or replace function public.add_credits(p_amount int, p_reason text) returns int
language plpgsql security definer set search_path = public as $$
declare newbal int; begin
  update public.profiles set credits = credits + p_amount where id = auth.uid() returning credits into newbal;
  insert into public.credit_transactions (user_id, delta, reason) values (auth.uid(), p_amount, p_reason);
  return newbal;
end; $$;

grant execute on function public.spend_credits(int,text) to authenticated;
grant execute on function public.add_credits(int,text) to authenticated;
