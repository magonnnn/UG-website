alter table public.teams
    add column if not exists esea_live_synced_at timestamptz;
