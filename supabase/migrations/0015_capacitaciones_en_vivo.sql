-- Capacitaciones en vivo por YouTube, sin la API de Google.
--
-- El flujo que resuelve:
--   1. El instructor abre la transmisión en el canal de YouTube (no listada).
--   2. El admin la **activa** desde la plataforma pegando el link del canal o
--      del directo. La Edge Function `youtube-live` lee la página pública de
--      YouTube (scraping del `ytInitialPlayerResponse`) y averigua qué video
--      está al aire, cómo se llama y en qué estado está. Cero API keys.
--   3. La gente la ve embebida dentro de la plataforma, no en YouTube: así se
--      sabe **quién** la está viendo (`live_attendance`) y cuánto tiempo.
--   4. Cuando termina, YouTube deja la grabación con **el mismo id de video**;
--      la función lo detecta y lo copia a `youtube_video_id`. La grabación
--      queda publicada sola: nadie tiene que volver a cargarla a mano.
--   5. El tiempo que cada quien estuvo en el directo se acredita como progreso
--      de visualización, así que quien la vio en vivo no tiene que volver a
--      ver la grabación (y con la regla de siempre —90%— se le da por
--      completada, con su diploma si aplica).
--
-- Una capacitación tiene una transmisión a la vez. Al activar otra se limpian
-- los campos del directo anterior; `youtube_video_id` no se pisa una vez que
-- ya guardó una grabación.

-- ── Estado de la transmisión en la capacitación ──────────────────────────

alter table public.trainings
  add column if not exists live_enabled boolean not null default false,
  add column if not exists live_source_url text,
  add column if not exists live_video_id text,
  add column if not exists live_status text not null default 'inactiva',
  add column if not exists live_title text,
  add column if not exists live_scheduled_at timestamptz,
  add column if not exists live_started_at timestamptz,
  add column if not exists live_ended_at timestamptz,
  add column if not exists live_checked_at timestamptz,
  add column if not exists live_error text;

alter table public.trainings drop constraint if exists trainings_live_status_check;
alter table public.trainings add constraint trainings_live_status_check
  check (live_status in ('inactiva', 'programada', 'en_vivo', 'finalizada'));

comment on column public.trainings.live_enabled is
  'Interruptor del admin: mientras esté encendido la plataforma consulta el estado del directo.';
comment on column public.trainings.live_source_url is
  'Link del canal (o del directo) que se lee para resolver la transmisión. Sin API: se lee la página pública.';
comment on column public.trainings.live_video_id is
  'Video de YouTube que está transmitiendo. Al terminar se copia a youtube_video_id.';
comment on column public.trainings.live_status is
  'inactiva | programada (con hora anunciada) | en_vivo | finalizada.';
comment on column public.trainings.live_checked_at is
  'Última lectura de la página de YouTube. Sirve para no consultar de más.';
comment on column public.trainings.live_error is
  'Qué falló en la última lectura (canal sin directo, link inválido, YouTube sin responder…).';

-- Índice de las que hay que estar consultando: son pocas, casi siempre cero.
create index if not exists idx_trainings_live_activas on public.trainings(live_status)
  where live_enabled;

-- ── Quién está viendo la transmisión ─────────────────────────────────────
-- Una fila por persona y transmisión. El latido del reproductor la mantiene
-- viva; `watched_seconds` lo acumula el servidor (nunca el cliente) sumando
-- el tiempo entre latidos consecutivos.

create table if not exists public.live_attendance (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  watched_seconds numeric not null default 0,
  is_watching boolean not null default true,
  area_id uuid references public.areas(id),
  sucursal_id uuid references public.sucursales(id),
  credited_at timestamptz,
  unique (training_id, user_id)
);

create index if not exists idx_live_attendance_training
  on public.live_attendance(training_id, last_seen_at desc);
create index if not exists idx_live_attendance_user
  on public.live_attendance(user_id);

comment on table public.live_attendance is
  'Asistencia a la transmisión en vivo: quién la vio dentro de la plataforma y cuánto tiempo. Solo la escribe live_heartbeat.';
comment on column public.live_attendance.is_watching is
  'Lo apaga el reproductor al salir; con el latido vencido también se considera desconectado.';
comment on column public.live_attendance.credited_at is
  'Cuándo se convirtió este tiempo en progreso de visualización de la grabación.';

alter table public.live_attendance enable row level security;

create policy "leer asistencia en vivo propia o admin" on public.live_attendance
for select to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('administrador', 'owner'));

-- Sin políticas de escritura: el tiempo lo acredita el servidor, no el cliente.

-- ── Latido del reproductor en vivo ───────────────────────────────────────

-- Cuánta gente está viendo el directo ahora mismo. Es lo único del panel de
-- asistencia que ve cualquiera: el conteo, nunca los nombres.
create or replace function public.live_viewer_count(p_training_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
  from public.live_attendance
  where training_id = p_training_id
    and is_watching
    and last_seen_at > now() - interval '45 seconds';
$$;

-- SECURITY DEFINER a propósito: el cliente no manda cuántos segundos vio,
-- solo avisa "sigo aquí". El servidor suma el hueco entre latidos, y solo si
-- es creíble (≤ 90 s, o sea un par de latidos perdidos); si el latido se cortó
-- más tiempo, el hueco no se acredita.

create or replace function public.live_heartbeat(
  p_training_id uuid,
  p_leaving boolean default false
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_training public.trainings%rowtype;
  v_viewers integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'no_autenticado', 'viewers', 0);
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.approval_status = 'aprobado'
  ) then
    return jsonb_build_object('status', 'no_autorizado', 'viewers', 0);
  end if;

  select * into v_training from public.trainings where id = p_training_id;
  if not found or not v_training.live_enabled or v_training.live_status <> 'en_vivo' then
    return jsonb_build_object('status', 'sin_transmision', 'viewers', 0);
  end if;

  insert into public.live_attendance as la
    (training_id, user_id, video_id, area_id, sucursal_id, is_watching)
  select
    p_training_id, auth.uid(), v_training.live_video_id,
    pr.area_id, pr.sucursal_id, not p_leaving
  from public.profiles pr
  where pr.id = auth.uid()
  on conflict (training_id, user_id) do update set
    last_seen_at = now(),
    is_watching = not p_leaving,
    video_id = coalesce(excluded.video_id, la.video_id),
    watched_seconds = la.watched_seconds + case
      when la.is_watching and now() - la.last_seen_at <= interval '90 seconds'
        then extract(epoch from (now() - la.last_seen_at))
      else 0
    end;

  select public.live_viewer_count(p_training_id) into v_viewers;
  return jsonb_build_object('status', 'ok', 'viewers', v_viewers);
end;
$$;

-- ── De transmisión a grabación ───────────────────────────────────────────
-- Al terminar el directo, el tiempo que cada quien estuvo conectado se vuelve
-- progreso de visualización de la grabación. El rango se acredita desde el
-- inicio ([[0, segundos]]) porque el directo no deja saber qué tramo vio cada
-- quien; quien entró tarde puede completar lo que le falta con la grabación.
--
-- No inventa reglas nuevas: escribe el tiempo real y deja que el trigger de
-- siempre (90% → completed_at → diploma) decida quién la acreditó.

create or replace function public.credit_live_attendance(
  p_training_id uuid,
  p_duration numeric
)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_duration numeric := nullif(p_duration, 0);
  v_seconds numeric;
  v_count integer := 0;
  r record;
begin
  if v_duration is null or v_duration <= 0 then
    return 0;
  end if;

  for r in
    select id, user_id, watched_seconds
    from public.live_attendance
    where training_id = p_training_id
      and credited_at is null
      and watched_seconds > 0
  loop
    v_seconds := least(r.watched_seconds, v_duration);

    insert into public.watch_progress as wp
      (training_id, user_id, watched_ranges, watched_seconds,
       last_position_seconds, video_duration_seconds)
    values
      (p_training_id, r.user_id,
       jsonb_build_array(jsonb_build_array(0, v_seconds)),
       v_seconds, 0, v_duration)
    on conflict (training_id, user_id) do update set
      watched_ranges = case
        when v_seconds > wp.watched_seconds then excluded.watched_ranges
        else wp.watched_ranges
      end,
      watched_seconds = greatest(wp.watched_seconds, v_seconds),
      video_duration_seconds = coalesce(wp.video_duration_seconds, excluded.video_duration_seconds),
      last_heartbeat_at = now();

    update public.live_attendance
    set credited_at = now(), is_watching = false
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── Aviso de que la transmisión empezó ───────────────────────────────────
-- Va a la campana del encabezado (no hay SMTP). Respeta el alcance por área
-- de la capacitación, igual que el dashboard.

create or replace function public.notify_live_started()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_recipients uuid[];
begin
  select array_agg(p.id) into v_recipients
  from public.profiles p
  where p.is_active
    and p.approval_status = 'aprobado'
    and (
      not exists (
        select 1 from public.training_areas ta where ta.training_id = new.id
      )
      or exists (
        select 1 from public.training_areas ta
        where ta.training_id = new.id and ta.area_id = p.area_id
      )
    );

  perform public.notify_users(
    v_recipients,
    'capacitacion_en_vivo',
    'Capacitación en vivo',
    new.title || ' está transmitiendo ahora.',
    '/capacitaciones/' || new.id::text,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_live_started on public.trainings;
create trigger trg_notify_live_started
after update on public.trainings
for each row
when (new.live_status = 'en_vivo' and old.live_status is distinct from 'en_vivo')
execute function public.notify_live_started();

-- ── Vista del dashboard ──────────────────────────────────────────────────
-- Las capacitaciones en vivo (o con hora anunciada) también tienen que
-- aparecer aunque todavía no exista la grabación, así que el filtro deja de
-- exigir video o examen para ellas.
--
-- Ojo: `create or replace view` no permite quitar ni reordenar columnas, así
-- que las de la transmisión se agregan al final de la definición viva.

create or replace view public.user_training_status
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
  coalesce(wp.watch_percent, 0::numeric) as watch_percent,
  coalesce(wp.watched_seconds, 0::numeric) as watched_seconds,
  coalesce(wp.last_position_seconds, 0::numeric) as last_position_seconds,
  wp.video_duration_seconds,
  wp.completed_at,
  wp.last_heartbeat_at,
  a.id is not null as attended_in_person,
  e.id is not null as has_exam,
  coalesce(ea.passed, false) as exam_passed,
  ea.best_percent as exam_best_percent,
  p.full_name,
  ar.nombre as area_nombre,
  su.nombre as sucursal_nombre,
  t.cover_image_url,
  t.live_status,
  t.live_video_id,
  t.live_title,
  t.live_scheduled_at,
  t.live_started_at
from public.trainings t
cross join public.profiles p
left join public.areas ar on ar.id = p.area_id
left join public.sucursales su on su.id = p.sucursal_id
left join public.watch_progress wp on wp.training_id = t.id and wp.user_id = p.id
left join public.attendance a on a.training_id = t.id and a.user_id = p.id
left join public.exams e on e.training_id = t.id and e.is_published
left join lateral (
  select bool_or(att.passed) as passed, max(att.score_percent) as best_percent
  from public.exam_attempts att
  where att.exam_id = e.id and att.user_id = p.id and att.submitted_at is not null
) ea on true
where p.is_active
  and (
    t.youtube_video_id is not null
    or e.id is not null
    or (t.live_enabled and t.live_status in ('programada', 'en_vivo'))
  )
  and (
    not exists (
      select 1 from public.training_areas ta where ta.training_id = t.id
    )
    or exists (
      select 1
      from public.training_areas ta
      where ta.training_id = t.id and ta.area_id = p.area_id
    )
  );

-- ── Endurecimiento (advisors) ────────────────────────────────────────────
-- credit_live_attendance solo la llama la Edge Function con la service role
-- key; el trigger de aviso, nadie.

revoke execute on function public.credit_live_attendance(uuid, numeric)
  from public, anon, authenticated;
revoke execute on function public.notify_live_started() from public, anon, authenticated;

revoke execute on function public.live_heartbeat(uuid, boolean) from public, anon;
grant execute on function public.live_heartbeat(uuid, boolean) to authenticated;

revoke execute on function public.live_viewer_count(uuid) from public, anon;
grant execute on function public.live_viewer_count(uuid) to authenticated;
