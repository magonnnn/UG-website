alter table public.teams
    add column if not exists esea_results_sync_version integer not null default 0;
