alter table public.matches
    add column if not exists team_2_name text,
    add column if not exists faceit_match_id text;

alter table public.matches
    alter column faceit_match_id type text using faceit_match_id::text;

alter table public.matches
    alter column team_2_id drop not null,
    alter column league drop not null;

alter table public.teams
    add column if not exists esea_fixtures_synced_at timestamptz;

create unique index if not exists matches_faceit_match_id_uidx
    on public.matches (faceit_match_id);
