-- Imagen de portada de la capacitación.
--
-- Las tarjetas del dashboard muestran una imagen. Si el admin no elige una,
-- el frontend usa la miniatura del video de YouTube; esta columna guarda la
-- imagen elegida a mano (o la portada de una capacitación que aún no tiene
-- video).

alter table public.trainings
  add column if not exists cover_image_url text;

-- La vista del dashboard debe exponer la portada para pintar la tarjeta.
--
-- Ojo: esta definición parte de la vista que está viva en el proyecto, que
-- ya incluía cambios posteriores a 0005 (filtro de perfiles activos, alcance
-- por área vía training_areas y los nombres de perfil/área/sucursal). Se
-- conservan tal cual y solo se agrega `cover_image_url` al final, porque
-- `create or replace view` no permite quitar ni reordenar columnas.

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
  t.cover_image_url
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
      select 1
      from public.training_areas ta
      where ta.training_id = t.id and ta.area_id = p.area_id
    )
  );

-- ── Bucket de portadas ───────────────────────────────────────────────────
-- Las portadas se suben desde el panel de administración. El bucket es
-- público de lectura (la imagen se muestra en el dashboard de todos) y solo
-- administradores y owners pueden escribir en él.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-covers',
  'training-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "training_covers_admin_insert" on storage.objects;
drop policy if exists "training_covers_admin_update" on storage.objects;
drop policy if exists "training_covers_admin_delete" on storage.objects;

create policy "training_covers_admin_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'training-covers'
  and public.current_user_role() in ('administrador', 'owner')
);

create policy "training_covers_admin_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'training-covers'
  and public.current_user_role() in ('administrador', 'owner')
)
with check (
  bucket_id = 'training-covers'
  and public.current_user_role() in ('administrador', 'owner')
);

create policy "training_covers_admin_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'training-covers'
  and public.current_user_role() in ('administrador', 'owner')
);
