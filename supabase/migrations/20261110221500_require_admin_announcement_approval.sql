alter table public.announcements
    add column if not exists is_approved boolean not null default true;

alter table public.announcements
    alter column is_approved set default false;

create or replace function public.is_announcement_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.users
        where users.id = (select auth.uid())
          and users.role = 'admin'
    );
$$;

revoke all on function public.is_announcement_admin() from public;
grant execute on function public.is_announcement_admin() to anon, authenticated;

alter table public.announcements enable row level security;
grant select on public.announcements to anon, authenticated;
grant insert, update on public.announcements to authenticated;
revoke update on public.announcements from anon, public;

drop policy if exists "Admins can view pending announcements" on public.announcements;
create policy "Admins can view pending announcements"
    on public.announcements
    for select
    to authenticated
    using ((select public.is_announcement_admin()));

drop policy if exists "Admins can approve announcements" on public.announcements;
create policy "Admins can approve announcements"
    on public.announcements
    for update
    to authenticated
    using ((select public.is_announcement_admin()))
    with check ((select public.is_announcement_admin()));

drop policy if exists "Only admins can update announcements" on public.announcements;
create policy "Only admins can update announcements"
    on public.announcements
    as restrictive
    for update
    to authenticated
    using ((select public.is_announcement_admin()))
    with check ((select public.is_announcement_admin()));

drop policy if exists "Announcements must be submitted pending by their author" on public.announcements;
create policy "Announcements must be submitted pending by their author"
    on public.announcements
    as restrictive
    for insert
    to authenticated
    with check (
        is_approved = false
        and added_by = (select auth.uid())
    );

drop policy if exists "Only approved announcements are publicly visible" on public.announcements;
create policy "Only approved announcements are publicly visible"
    on public.announcements
    as restrictive
    for select
    to anon, authenticated
    using (
        is_approved = true
        or (select public.is_announcement_admin())
    );
