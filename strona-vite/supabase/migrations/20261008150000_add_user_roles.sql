alter table public.users
    add column if not exists role text not null default 'user';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'users_role_check'
          and conrelid = 'public.users'::regclass
    ) then
        alter table public.users
            add constraint users_role_check
            check (role in ('user', 'admin'));
    end if;
end
$$;

comment on column public.users.role is
    'Authorization role. Set admin roles only from a trusted database session.';

create or replace function public.prevent_user_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if (select auth.uid()) is not null then
        if (tg_op = 'INSERT' and new.role <> 'user')
            or (tg_op = 'UPDATE' and new.role is distinct from old.role) then
            raise exception 'Only a trusted database session can change user roles';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists prevent_user_role_escalation on public.users;

create trigger prevent_user_role_escalation
    before insert or update of role on public.users
    for each row
    execute function public.prevent_user_role_escalation();
