create index if not exists tournaments_winners_gin_idx
    on public.tournaments
    using gin (winners jsonb_path_ops);
