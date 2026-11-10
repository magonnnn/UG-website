update public.announcements as announcement
set added_by_username = profile.name
from public.users as profile
where announcement.added_by = profile.id
  and nullif(trim(profile.name), '') is not null
  and announcement.added_by_username is distinct from profile.name;
