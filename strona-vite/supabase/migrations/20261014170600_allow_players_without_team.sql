alter table public.players
    alter column current_team drop identity if exists;

alter table public.players
    alter column current_team drop not null;
