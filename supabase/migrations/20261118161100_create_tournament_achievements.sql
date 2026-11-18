create table if not exists public.tournament_achievements (
    id uuid primary key default gen_random_uuid(),
    tournament_id bigint not null
        references public.tournaments(id) on delete cascade,
    team_id bigint
        references public.teams(id) on delete set null,
    team_source text not null
        check (team_source in ('linked', 'custom')),
    team_name text not null
        check (length(trim(team_name)) > 0),
    placement text,
    roster jsonb not null default '[]'::jsonb
        check (jsonb_typeof(roster) = 'array'),
    created_at timestamptz not null default now(),
    constraint tournament_achievements_custom_team_check
        check (team_source <> 'custom' or team_id is null)
);

create index if not exists tournament_achievements_tournament_id_idx
    on public.tournament_achievements (tournament_id);

create index if not exists tournament_achievements_team_id_idx
    on public.tournament_achievements (team_id)
    where team_id is not null;

create index if not exists tournament_achievements_roster_gin_idx
    on public.tournament_achievements
    using gin (roster jsonb_path_ops);

with legacy_entries as (
    select
        tournaments.id as tournament_id,
        entry.value as entry,
        case
            when jsonb_typeof(entry.value) = 'object'
                then coalesce(
                    entry.value -> 'team',
                    entry.value -> 'team_id',
                    entry.value -> 'team_name',
                    entry.value -> 'name'
                )
            else entry.value
        end as team_ref
    from public.tournaments
    cross join lateral jsonb_array_elements(
        case
            when jsonb_typeof(tournaments.winners) = 'array'
                then tournaments.winners
            when tournaments.winners is null
                or jsonb_typeof(tournaments.winners) = 'null'
                then '[]'::jsonb
            else jsonb_build_array(tournaments.winners)
        end
    ) as entry(value)
),
valid_entries as (
    select *
    from legacy_entries
    where (
        jsonb_typeof(team_ref) = 'string'
        and length(trim(team_ref #>> '{}')) > 0
    ) or (
        jsonb_typeof(team_ref) = 'number'
        and (team_ref #>> '{}') ~ '^-?[0-9]+$'
    )
)
insert into public.tournament_achievements (
    tournament_id,
    team_id,
    team_source,
    team_name,
    placement,
    roster
)
select
    valid_entries.tournament_id,
    linked_team.id,
    case
        when jsonb_typeof(valid_entries.team_ref) = 'number' then 'linked'
        else 'custom'
    end,
    case
        when jsonb_typeof(valid_entries.team_ref) = 'number' then
            coalesce(
                nullif(trim(valid_entries.entry ->> 'team_name'), ''),
                linked_team.name,
                'Drużyna #' || (valid_entries.team_ref #>> '{}')
            )
        else coalesce(
            nullif(trim(valid_entries.entry ->> 'team_name'), ''),
            valid_entries.team_ref #>> '{}'
        )
    end,
    nullif(
        trim(coalesce(valid_entries.entry ->> 'placement', valid_entries.entry ->> 'result')),
        ''
    ),
    case
        when jsonb_typeof(valid_entries.entry -> 'roster') = 'array'
            then valid_entries.entry -> 'roster'
        else '[]'::jsonb
    end
from valid_entries
left join public.teams as linked_team
    on linked_team.id = case
        when jsonb_typeof(valid_entries.team_ref) = 'number'
            and (valid_entries.team_ref #>> '{}') ~ '^-?[0-9]+$'
            then (valid_entries.team_ref #>> '{}')::bigint
        else null
    end;

create or replace function public.is_tournament_achievement_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.users
        where users.id = (select auth.uid())
          and users.role = 'admin'
    );
$$;

revoke all on function public.is_tournament_achievement_admin() from public;
grant execute on function public.is_tournament_achievement_admin() to authenticated;

alter table public.tournament_achievements enable row level security;

grant select on public.tournament_achievements to anon, authenticated;
grant insert, update, delete on public.tournament_achievements to authenticated;

drop policy if exists "Tournament achievements are viewable by everyone"
    on public.tournament_achievements;
create policy "Tournament achievements are viewable by everyone"
    on public.tournament_achievements
    for select
    to anon, authenticated
    using (true);

drop policy if exists "Admins can insert tournament achievements"
    on public.tournament_achievements;
create policy "Admins can insert tournament achievements"
    on public.tournament_achievements
    for insert
    to authenticated
    with check ((select public.is_tournament_achievement_admin()));

drop policy if exists "Admins can update tournament achievements"
    on public.tournament_achievements;
create policy "Admins can update tournament achievements"
    on public.tournament_achievements
    for update
    to authenticated
    using ((select public.is_tournament_achievement_admin()))
    with check ((select public.is_tournament_achievement_admin()));

drop policy if exists "Admins can delete tournament achievements"
    on public.tournament_achievements;
create policy "Admins can delete tournament achievements"
    on public.tournament_achievements
    for delete
    to authenticated
    using ((select public.is_tournament_achievement_admin()));

alter table public.tournaments
    drop column if exists winners;
