-- Direct table access for custom auth (no RPC, no Supabase Auth).
-- Run in Supabase SQL Editor.

drop function if exists public.register_user(text, text, text, text, text);
drop function if exists public.login_user(text, text);

grant select, insert on public.users to anon, authenticated;

drop policy if exists "anon can signup" on public.users;
create policy "anon can signup"
  on public.users
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anon can login lookup" on public.users;
create policy "anon can login lookup"
  on public.users
  for select
  to anon, authenticated
  using (true);
