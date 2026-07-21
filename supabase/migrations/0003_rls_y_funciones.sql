-- Políticas RLS por rol y funciones RPC de la plataforma.

alter table public.areas enable row level security;
alter table public.sucursales enable row level security;
alter table public.profiles enable row level security;
alter table public.trainings enable row level security;
alter table public.attendance enable row level security;
alter table public.watch_progress enable row level security;

-- ── Catálogos ────────────────────────────────────────────────────────────
-- anon puede leer catálogos activos (el formulario de registro los necesita
-- antes de tener sesión). Admin/owner los administra.

create policy "catalogos activos visibles" on public.areas
for select using (activo = true or public.current_user_role() in ('administrador', 'owner'));

create policy "admin administra areas" on public.areas
for all using (public.current_user_role() in ('administrador', 'owner'))
with check (public.current_user_role() in ('administrador', 'owner'));

create policy "catalogos activos visibles" on public.sucursales
for select using (activo = true or public.current_user_role() in ('administrador', 'owner'));

create policy "admin administra sucursales" on public.sucursales
for all using (public.current_user_role() in ('administrador', 'owner'))
with check (public.current_user_role() in ('administrador', 'owner'));

-- ── Perfiles ─────────────────────────────────────────────────────────────
-- Lectura: el propio perfil, o todos para admin/owner.
-- Escritura: el propio perfil o admin/owner; las columnas sensibles
-- (role, is_active, username, email, auth_method) las protege el trigger
-- guard_profile_changes de la migración 0001.

create policy "leer perfil propio o admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_user_role() in ('administrador', 'owner'));

create policy "editar perfil propio o admin" on public.profiles
for update to authenticated
using (id = auth.uid() or public.current_user_role() in ('administrador', 'owner'))
with check (id = auth.uid() or public.current_user_role() in ('administrador', 'owner'));

-- ── Capacitaciones ───────────────────────────────────────────────────────

create policy "usuarios autenticados ven capacitaciones" on public.trainings
for select to authenticated
using (true);

create policy "admin administra capacitaciones" on public.trainings
for all to authenticated
using (public.current_user_role() in ('administrador', 'owner'))
with check (public.current_user_role() in ('administrador', 'owner'));

-- ── Asistencia ───────────────────────────────────────────────────────────
-- El registro siempre es del propio usuario (vía checkin_via_qr).

create policy "leer asistencia propia o admin" on public.attendance
for select to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('administrador', 'owner'));

create policy "registrar asistencia propia" on public.attendance
for insert to authenticated
with check (user_id = auth.uid());

-- ── Progreso de visualización ────────────────────────────────────────────

create policy "leer progreso propio o admin" on public.watch_progress
for select to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('administrador', 'owner'));

create policy "insertar progreso propio" on public.watch_progress
for insert to authenticated
with check (user_id = auth.uid());

create policy "actualizar progreso propio" on public.watch_progress
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ── RPC: título de capacitación por token QR ─────────────────────────────
-- Permite a la página pública de check-in mostrar el nombre de la sesión
-- sin exponer el resto de la tabla (ni el ID del video) a anónimos.

create or replace function public.training_title_for_token(p_token uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select title from public.trainings where qr_token = p_token;
$$;

-- ── RPC: check-in por QR ─────────────────────────────────────────────────
-- SECURITY INVOKER: la inserción pasa por las políticas RLS de attendance.
-- Congela área/sucursal del perfil al momento del escaneo.

create or replace function public.checkin_via_qr(p_token uuid)
returns table (status text, training_title text)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_training_id uuid;
  v_title text;
begin
  if auth.uid() is null then
    return query select 'not_authenticated'::text, null::text;
    return;
  end if;

  select t.id, t.title into v_training_id, v_title
  from public.trainings t where t.qr_token = p_token;

  if v_training_id is null then
    return query select 'invalid_token'::text, null::text;
    return;
  end if;

  if exists (
    select 1 from public.attendance a
    where a.training_id = v_training_id and a.user_id = auth.uid()
  ) then
    return query select 'already_checked_in'::text, v_title;
    return;
  end if;

  insert into public.attendance (training_id, user_id, area_id, sucursal_id)
  select v_training_id, auth.uid(), pr.area_id, pr.sucursal_id
  from public.profiles pr where pr.id = auth.uid();

  return query select 'checked_in'::text, v_title;
end;
$$;

-- ── RPC: guardar progreso de visualización ───────────────────────────────
-- El cliente envía sus rangos vistos fusionados [[inicio, fin], ...].
-- El servidor valida estructura, orden y no-traslape, y aplica dos guardas
-- anti-trampa:
--   1. watched_seconds nunca retrocede (greatest con lo ya guardado).
--   2. El avance acreditado no puede superar 2.5x el tiempo real
--      transcurrido desde el último heartbeat (+30s de holgura), lo que
--      permite ver a velocidad 2x pero impide saltar al final sin ver.

create or replace function public.upsert_watch_progress(
  p_training_id uuid,
  p_ranges jsonb,
  p_position numeric,
  p_duration numeric
)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_covered numeric := 0;
  v_prev_end numeric := -1;
  v_start numeric;
  v_end numeric;
  v_item jsonb;
  v_duration numeric := nullif(p_duration, 0);
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if jsonb_typeof(p_ranges) <> 'array' or jsonb_array_length(p_ranges) > 500 then
    raise exception 'Rangos invalidos';
  end if;

  for v_item in select * from jsonb_array_elements(p_ranges) loop
    if jsonb_typeof(v_item) <> 'array' or jsonb_array_length(v_item) <> 2 then
      raise exception 'Rangos invalidos';
    end if;
    v_start := (v_item->>0)::numeric;
    v_end := (v_item->>1)::numeric;
    if v_start < 0 or v_end <= v_start or v_start < v_prev_end then
      raise exception 'Rangos invalidos';
    end if;
    if v_duration is not null then
      v_end := least(v_end, v_duration);
    end if;
    if v_end > v_start then
      v_covered := v_covered + (v_end - v_start);
    end if;
    v_prev_end := v_end;
  end loop;

  insert into public.watch_progress as wp
    (training_id, user_id, watched_ranges, watched_seconds,
     last_position_seconds, video_duration_seconds)
  values
    (p_training_id, auth.uid(), p_ranges,
     least(v_covered, 60), -- primer registro: tope de 60s (el primer flush ocurre a ~15s de reproducción)
     greatest(p_position, 0), v_duration)
  on conflict (training_id, user_id) do update set
    watched_ranges = case
      when v_covered >= wp.watched_seconds then excluded.watched_ranges
      else wp.watched_ranges
    end,
    watched_seconds = greatest(
      wp.watched_seconds,
      least(
        v_covered,
        wp.watched_seconds
          + extract(epoch from (now() - wp.last_heartbeat_at)) * 2.5 + 30
      )
    ),
    last_position_seconds = excluded.last_position_seconds,
    video_duration_seconds = coalesce(excluded.video_duration_seconds, wp.video_duration_seconds),
    session_count = wp.session_count
      + case when wp.last_heartbeat_at < now() - interval '30 minutes' then 1 else 0 end,
    last_heartbeat_at = now();
end;
$$;

-- ── Endurecimiento (advisors) ────────────────────────────────────────────
-- Las funciones de trigger no deben ser invocables vía la API REST.
-- current_user_role conserva EXECUTE porque las políticas RLS la evalúan
-- con los privilegios del rol consultante (anon/authenticated); para anon
-- devuelve null y no expone información.

revoke execute on function public.enforce_signup_email_rules() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_changes() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_watch_completed() from public, anon, authenticated;
