-- Cobertura: cuánta gente *debería* tomar cada capacitación, no solo cuánta la
-- tomó. La vista user_training_status ya cruza capacitaciones × perfiles
-- aplicando la regla de área, así que para un admin (que ve todos los perfiles
-- por RLS) sus filas de una capacitación **son** su audiencia esperada. Solo le
-- faltaban dos cosas:
--
--   1. Excluir las cuentas desactivadas, que inflaban el denominador: no pueden
--      entrar a la plataforma, así que no se les puede exigir la capacitación.
--   2. Traer nombre, área y sucursal, para poder listar a quién le falta sin
--      una segunda consulta (la vista no tiene FK, no admite embeber perfiles).

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
  ea.best_percent as exam_best_percent,
  p.full_name,
  ar.nombre as area_nombre,
  su.nombre as sucursal_nombre
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
  and (t.youtube_video_id is not null or e.id is not null)
  and (
    not exists (
      select 1 from public.training_areas ta where ta.training_id = t.id
    )
    or exists (
      select 1 from public.training_areas ta
      where ta.training_id = t.id and ta.area_id = p.area_id
    )
  );
