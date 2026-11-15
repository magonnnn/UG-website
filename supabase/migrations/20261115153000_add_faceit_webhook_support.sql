alter table public.matches
    add column if not exists cancelled boolean not null default false;

create table if not exists public.faceit_webhook_events (
    event_key text primary key,
    event_type text not null,
    match_id text not null,
    created_at timestamptz not null default now(),
    processing_started_at timestamptz not null default now(),
    processed_at timestamptz
);

create index if not exists faceit_webhook_events_created_at_idx
    on public.faceit_webhook_events (created_at);

alter table public.faceit_webhook_events enable row level security;

revoke all on table public.faceit_webhook_events from anon, authenticated;
grant all on table public.faceit_webhook_events to service_role;
