create table if not exists public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    name text,
    email text,
    avatar_url text,
    last_login_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.users
    add column if not exists email text,
    add column if not exists avatar_url text,
    add column if not exists last_login_at timestamptz,
    add column if not exists created_at timestamptz not null default now();

alter table public.users enable row level security;

grant select, insert, update on public.users to authenticated;

create policy "Users can view their own profile"
    on public.users
    for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
    on public.users
    for insert
    to authenticated
    with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.users
    for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);
