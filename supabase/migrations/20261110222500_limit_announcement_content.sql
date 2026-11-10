alter table public.announcements
    add constraint announcements_content_max_length
    check (char_length(content) <= 2000)
    not valid;
