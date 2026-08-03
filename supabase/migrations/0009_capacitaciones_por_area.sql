-- Clasificación de capacitaciones por área: cada quien ve en su dashboard
-- solo las que le hacen falta.
--
-- Relación N:M porque una misma capacitación suele aplicar a varias áreas
-- (p. ej. manejo de cloro gas: Operaciones y Mantenimiento). Una capacitación
-- **sin áreas** es para todo el personal — así las que ya existen siguen
-- viéndose igual y no hay que reclasificarlas para que nadie las pierda.

create table public.training_areas (
  training_id uuid not null references public.trainings(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  primary key (training_id, area_id)
);

-- La PK ya indexa training_id; falta el sentido contrario (área → capacitaciones).
create index idx_training_areas_area on public.training_areas(area_id);

alter table public.training_areas enable row level security;

-- La clasificación no es secreta: saber a qué área pertenece una capacitación
-- no revela su contenido, y el filtro real lo aplica la vista.
create policy "usuarios autenticados ven la clasificacion" on public.training_areas
for select to authenticated
using (true);

create policy "admin administra la clasificacion" on public.training_areas
for all to authenticated
using (public.current_user_role() in ('administrador', 'owner'))
with check (public.current_user_role() in ('administrador', 'owner'));

-- ── RPC: fijar las áreas de una capacitación ─────────────────────────────
-- security invoker: autoriza la política de admin sobre training_areas.
-- Reemplaza el conjunto completo en una sola transacción, sin dejar a la
-- capacitación un instante sin clasificar (que la volvería "para todos").

create or replace function public.set_training_areas(
  p_training_id uuid,
  p_area_ids uuid[]
)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_ids uuid[] := coalesce(p_area_ids, '{}'::uuid[]);
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  delete from public.training_areas ta
  where ta.training_id = p_training_id
    and not (ta.area_id = any (v_ids));

  insert into public.training_areas (training_id, area_id)
  select p_training_id, x
  from unnest(v_ids) as x
  on conflict do nothing;
end;
$$;

revoke execute on function public.set_training_areas(uuid, uuid[]) from public, anon;
grant execute on function public.set_training_areas(uuid, uuid[]) to authenticated;

-- ── Vista del dashboard ──────────────────────────────────────────────────
-- Se agrega el filtro por área: la capacitación aparece si no tiene áreas
-- (es para todos) o si alguna coincide con la del perfil. Un perfil sin área
-- solo ve las generales.
--
-- El filtro es estricto a propósito: quien cambia de área deja de ver en su
-- dashboard las capacitaciones del área anterior, aunque ya las haya visto.
-- El registro no se pierde — sigue en watch_progress/attendance y el admin lo
-- ve completo en la ficha de la capacitación.

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
  coalesce(wp.watch_percent, 0) as watch_percent,
  coalesce(wp.watched_seconds, 0) as watched_seconds,
  coalesce(wp.last_position_seconds, 0) as last_position_seconds,
  wp.video_duration_seconds,
  wp.completed_at,
  wp.last_heartbeat_at,
  (a.id is not null) as attended_in_person,
  (e.id is not null) as has_exam,
  coalesce(ea.passed, false) as exam_passed,
  ea.best_percent as exam_best_percent
from public.trainings t
cross join public.profiles p
left join public.watch_progress wp on wp.training_id = t.id and wp.user_id = p.id
left join public.attendance a on a.training_id = t.id and a.user_id = p.id
left join public.exams e on e.training_id = t.id and e.is_published
left join lateral (
  select bool_or(att.passed) as passed, max(att.score_percent) as best_percent
  from public.exam_attempts att
  where att.exam_id = e.id and att.user_id = p.id and att.submitted_at is not null
) ea on true
where (t.youtube_video_id is not null or e.id is not null)
  and (
    not exists (
      select 1 from public.training_areas ta where ta.training_id = t.id
    )
    or exists (
      select 1 from public.training_areas ta
      where ta.training_id = t.id and ta.area_id = p.area_id
    )
  );
