alter table public.teams
    add column if not exists esea_results_synced_at timestamptz;
