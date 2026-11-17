alter table public.teams
    add column coach_id bigint;

alter table public.teams
    add constraint teams_coach_id_fkey
    foreign key (coach_id)
    references public.players(id)
    on delete set null;

create index teams_coach_id_idx
    on public.teams (coach_id)
    where coach_id is not null;
