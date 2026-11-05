select cron.unschedule(jobid)
from cron.job
where jobname = 'reset-calendar-today-opened';

drop function if exists public.claim_calendar_reward();
drop function if exists public.reset_calendar_today_opened();
