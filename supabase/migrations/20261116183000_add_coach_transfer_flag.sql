alter table public.transfers
    add column is_coach boolean not null default false;

insert into public.transfers (player_id, from_id, to_id, is_coach)
select teams.coach_id, null, teams.id, true
from public.teams
where teams.coach_id is not null
  and not exists (
      select 1
      from public.transfers
      where transfers.player_id = teams.coach_id
        and transfers.to_id = teams.id
        and transfers.is_coach
  );
