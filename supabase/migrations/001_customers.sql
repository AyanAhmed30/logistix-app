-- Run this in your Supabase SQL editor to support customer authentication.

create table if not exists public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Customers can view own profile"
  on public.customers for select
  using (auth.uid() = id);

create policy "Customers can insert own profile"
  on public.customers for insert
  with check (auth.uid() = id);

create policy "Customers can update own profile"
  on public.customers for update
  using (auth.uid() = id);

create unique index if not exists customers_email_key on public.customers (email);
create unique index if not exists customers_phone_key on public.customers (phone);
