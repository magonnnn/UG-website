alter table public.users
    add column if not exists today_opened boolean not null default false;

revoke insert, update on public.users from authenticated;
grant insert (id, name, email, avatar_url, last_login_at)
    on public.users to authenticated;
grant update (id, name, email, avatar_url, last_login_at)
    on public.users to authenticated;

create or replace function public.claim_calendar_reward()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := (select auth.uid());
    v_claimed_user_id uuid;
    v_reward_id text;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    insert into public.users as existing_user (id, today_opened)
    values (v_user_id, true)
    on conflict (id) do update
        set today_opened = true
        where existing_user.today_opened = false
    returning id into v_claimed_user_id;

    if v_claimed_user_id is null then
        raise exception 'You have already opened today''s calendar';
    end if;

    select id::text
    into v_reward_id
    from public.calendar_rewards
    where awarded_to is null
    order by random()
    limit 1
    for update skip locked;

    if v_reward_id is null then
        raise exception 'No unclaimed calendar rewards are available';
    end if;

    update public.calendar_rewards
    set awarded_to = v_user_id
    where id::text = v_reward_id
      and awarded_to is null;

    if not found then
        raise exception 'The calendar reward is no longer available';
    end if;

    return v_reward_id;
end;
$$;

revoke all on function public.claim_calendar_reward() from public;
grant execute on function public.claim_calendar_reward() to authenticated;

create or replace function public.reset_calendar_today_opened()
returns void
language sql
security definer
set search_path = ''
as $$
    update public.users
    set today_opened = false
    where today_opened
      and extract(hour from (now() at time zone 'Europe/Warsaw')) = 0;
$$;

revoke all on function public.reset_calendar_today_opened() from public;
revoke all on function public.reset_calendar_today_opened() from anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
    'reset-calendar-today-opened',
    '0 * * * *',
    'select public.reset_calendar_today_opened()'
);
