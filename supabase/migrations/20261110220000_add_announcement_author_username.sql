alter table public.announcements
    add column if not exists added_by_username text;
