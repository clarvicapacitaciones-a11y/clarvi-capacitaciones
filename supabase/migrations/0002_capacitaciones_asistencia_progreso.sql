-- Capacitaciones, asistencia presencial (QR) y progreso de visualización.

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  youtube_video_id text,
  qr_token uuid not null default gen_random_uuid() unique,
  session_date date,
  duration_seconds numeric,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_trainings_created_by on public.trainings(created_by);

create trigger trg_trainings_updated_at
before update on public.trainings
for each row execute function public.set_updated_at();

-- Asistencia física registrada al escanear el QR de la sesión.
-- area/sucursal se congelan al momento del escaneo para reportes históricos.
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  area_id uuid references public.areas(id),
  sucursal_id uuid references public.sucursales(id),
  unique (training_id, user_id)
);

create index idx_attendance_training on public.attendance(training_id);
create index idx_attendance_user on public.attendance(user_id);
create index idx_attendance_area on public.attendance(area_id);
create index idx_attendance_sucursal on public.attendance(sucursal_id);

-- Progreso de visualización del video por usuario.
-- watched_ranges: rangos [inicio, fin] en segundos realmente reproducidos
-- (fusionados y sin traslape). watched_seconds: total cubierto, monotónico.
create table public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  watched_ranges jsonb not null default '[]'::jsonb,
  watched_seconds numeric not null default 0,
  last_position_seconds numeric not null default 0,
  video_duration_seconds numeric,
  watch_percent numeric generated always as (
    least(100, round(watched_seconds / nullif(video_duration_seconds, 0) * 100, 2))
  ) stored,
  completed_at timestamptz,
  session_count integer not null default 1,
  first_started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  unique (training_id, user_id)
);

create index idx_watch_progress_training on public.watch_progress(training_id);
create index idx_watch_progress_user on public.watch_progress(user_id);

-- Fija completed_at una sola vez al cruzar el 90% visto; nunca se limpia,
-- así una capacitación completada permanece completada aunque se re-vea.
create or replace function public.set_watch_completed()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_pct numeric;
begin
  if tg_op = 'UPDATE' and old.completed_at is not null then
    new.completed_at := old.completed_at;
    return new;
  end if;
  v_pct := coalesce(new.watched_seconds / nullif(new.video_duration_seconds, 0) * 100, 0);
  if v_pct >= 90 and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_watch_progress_completed
before insert or update on public.watch_progress
for each row execute function public.set_watch_completed();

-- Estado por usuario/capacitación para el dashboard personal.
-- security_invoker: las políticas RLS de las tablas subyacentes aplican,
-- por lo que un usuario normal solo ve sus propias filas.
create view public.user_training_status
with (security_invoker = true) as
select
  t.id as training_id,
  p.id as user_id,
  t.title,
  t.description,
  t.youtube_video_id,
  t.session_date,
  case
    when wp.completed_at is not null then 'completed'
    when wp.id is not null then 'in_progress'
    else 'pending'
  end as status,
  coalesce(wp.watch_percent, 0) as watch_percent,
  coalesce(wp.watched_seconds, 0) as watched_seconds,
  coalesce(wp.last_position_seconds, 0) as last_position_seconds,
  wp.video_duration_seconds,
  wp.completed_at,
  wp.last_heartbeat_at,
  (a.id is not null) as attended_in_person
from public.trainings t
cross join public.profiles p
left join public.watch_progress wp on wp.training_id = t.id and wp.user_id = p.id
left join public.attendance a on a.training_id = t.id and a.user_id = p.id
where t.youtube_video_id is not null;
