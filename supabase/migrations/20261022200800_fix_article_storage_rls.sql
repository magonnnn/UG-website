create or replace function public.is_article_admin()
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

revoke all on function public.is_article_admin() from public, anon;
grant execute on function public.is_article_admin() to authenticated;

drop policy if exists "Admins can upload article covers" on storage.objects;
create policy "Admins can upload article covers"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'articles'
        and (select public.is_article_admin())
    );

drop policy if exists "Admins can delete article covers" on storage.objects;
create policy "Admins can delete article covers"
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'articles'
        and (select public.is_article_admin())
    );
