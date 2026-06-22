-- Roomora — close the self-grant credit exploit.
-- public.add_credits(amount, reason) credits auth.uid() and was granted to
-- `authenticated`, so any signed-in user could call it from the browser console
-- and mint unlimited credits, bypassing Stripe. Revoke it from every client
-- role. The ONLY legitimate credit-add paths are server-side and run as the
-- service role via add_credits_for(): the Stripe webhook (purchase) and the
-- generate route's failure refund. Postgres also grants EXECUTE to PUBLIC by
-- default, so revoke from PUBLIC/anon too.
revoke execute on function public.add_credits(int, text) from public;
revoke execute on function public.add_credits(int, text) from anon;
revoke execute on function public.add_credits(int, text) from authenticated;

-- spend_credits stays granted to authenticated: it can only DECREASE the
-- caller's own balance, so it is not an abuse vector.
