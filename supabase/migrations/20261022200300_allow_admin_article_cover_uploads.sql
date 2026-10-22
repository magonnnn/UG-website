insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('articles', 'articles', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view article covers" on storage.objects;
create policy "Anyone can view article covers"
    on storage.objects
    for select
    to public
    using (bucket_id = 'articles');

drop policy if exists "Admins can upload article covers" on storage.objects;
create policy "Admins can upload article covers"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'articles'
        and exists (
            select 1
            from public.users
            where users.id = (select auth.uid())
              and users.role = 'admin'
        )
    );

drop policy if exists "Admins can delete article covers" on storage.objects;
create policy "Admins can delete article covers"
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'articles'
        and exists (
            select 1
            from public.users
            where users.id = (select auth.uid())
              and users.role = 'admin'
        )
    );
