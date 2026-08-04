-- Aprobación de registros.
--
-- El registro con correo se auto-verifica: solo pasa un @clarvi.com. El
-- registro por nombre de usuario no verifica nada — cualquiera podría crearse
-- una cuenta — así que nace `pendiente` y no puede usar la plataforma hasta
-- que un líder (o un administrador/owner) lo apruebe.
--
-- Nota: las comparaciones contra el rol 'lider' se hacen con ::text a
-- propósito. Si esta migración corriera en la misma transacción que la 0010,
-- Postgres rechazaría el literal 'lider'::user_role por ser un valor de enum
-- sin confirmar; comparar como texto no toca el enum nuevo.

-- ── Columnas de aprobación ───────────────────────────────────────────────
-- El default 'aprobado' deja aprobadas a todas las cuentas que ya existían;
-- de las nuevas decide handle_new_user según el método de registro.

-- La FK se nombra a mano porque la API la usa para desambiguar el embed
-- (profiles apunta a profiles: `approver:profiles!profiles_approved_by_fkey`).
alter table public.profiles
  add column approval_status public.approval_status_type not null default 'aprobado',
  add column approved_by uuid
    constraint profiles_approved_by_fkey references public.profiles(id) on delete set null,
  add column approved_at timestamptz,
  add column rejection_reason text;

create index idx_profiles_approval_status on public.profiles(approval_status);

comment on column public.profiles.approval_status is
  'Las cuentas por nombre de usuario nacen pendientes; las de correo @clarvi.com nacen aprobadas.';

-- ── Alta: quién nace pendiente ───────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_method text := coalesce(new.raw_user_meta_data->>'signup_method', 'email');
begin
  insert into public.profiles (
    id, full_name, email, username, auth_method, area_id, sucursal_id, approval_status
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Sin nombre'),
    case when v_method = 'email' then new.email end,
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    case
      when v_method = 'username' then 'username'::public.auth_method_type
      else 'email'::public.auth_method_type
    end,
    nullif(new.raw_user_meta_data->>'area_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'sucursal_id', '')::uuid,
    case
      when v_method = 'username' then 'pendiente'::public.approval_status_type
      else 'aprobado'::public.approval_status_type
    end
  );
  return new;
end;
$$;

-- ── Helper de aprobación ─────────────────────────────────────────────────
-- Igual que current_user_role: SECURITY DEFINER para que las políticas RLS lo
-- consulten sin recursión. Para anon devuelve false.

create or replace function public.current_user_is_approved()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.approval_status = 'aprobado' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ── Guarda de columnas sensibles de profiles ─────────────────────────────
-- Se reescribe completa (además de lo que ya cuidaba) para:
--  - approval_status: lo resuelven lider/administrador/owner, una sola vez, y
--    el sello (quién y cuándo) lo pone el servidor, no el cliente.
--  - el líder solo aprueba o rechaza: no edita datos, roles ni activaciones.

create or replace function public.guard_profile_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
begin
  if v_actor is null then
    return new; -- service role / procesos internos
  end if;
  v_actor_role := public.current_user_role()::text;

  if new.username is distinct from old.username then
    raise exception 'El nombre de usuario no se puede cambiar';
  end if;
  if new.auth_method is distinct from old.auth_method or new.email is distinct from old.email then
    raise exception 'El metodo de acceso no se puede cambiar';
  end if;

  if new.approval_status is distinct from old.approval_status then
    if v_actor_role not in ('lider', 'administrador', 'owner') then
      raise exception 'No autorizado para aprobar registros';
    end if;
    if old.id = v_actor then
      raise exception 'No puedes aprobar tu propio registro';
    end if;
    if old.approval_status <> 'pendiente' then
      raise exception 'Esa solicitud ya fue resuelta';
    end if;
    if new.approval_status = 'pendiente' then
      raise exception 'Estado de aprobacion invalido';
    end if;
    new.approved_by := v_actor;
    new.approved_at := now();
    if new.approval_status = 'aprobado' then
      new.rejection_reason := null;
    end if;
  else
    -- Sin resolución de por medio, el sello de aprobación no se toca.
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.rejection_reason := old.rejection_reason;
  end if;

  if v_actor_role = 'lider' and old.id <> v_actor then
    if new.full_name is distinct from old.full_name
      or new.area_id is distinct from old.area_id
      or new.sucursal_id is distinct from old.sucursal_id
      or new.role is distinct from old.role
      or new.is_active is distinct from old.is_active then
      raise exception 'Un lider solo puede aprobar o rechazar registros';
    end if;
  end if;

  if new.role is distinct from old.role then
    if v_actor_role <> 'owner' then
      raise exception 'Solo el owner puede cambiar roles';
    end if;
    if old.id = v_actor and old.role = 'owner' and new.role <> 'owner' then
      raise exception 'No puedes quitarte a ti mismo el rol de owner';
    end if;
  end if;

  if new.is_active is distinct from old.is_active and v_actor_role not in ('administrador', 'owner') then
    raise exception 'No autorizado para activar o desactivar cuentas';
  end if;

  if old.role = 'owner' and old.id <> v_actor and v_actor_role <> 'owner' then
    raise exception 'No puedes editar el perfil del owner';
  end if;

  return new;
end;
$$;

-- ── RLS: la cola de solicitudes del líder ────────────────────────────────
-- El líder no es administrador: no ve el roster completo. Ve las solicitudes
-- sin resolver, las rechazadas y las que él mismo aprobó.

drop policy "leer perfil propio o admin" on public.profiles;

create policy "leer perfil propio, admin o solicitudes" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.current_user_role() in ('administrador', 'owner')
  or (
    public.current_user_role()::text = 'lider'
    and (approval_status <> 'aprobado' or approved_by = auth.uid())
  )
);

drop policy "editar perfil propio o admin" on public.profiles;

-- El WITH CHECK del líder es amplio a propósito: qué puede cambiar de la fila
-- lo decide guard_profile_changes, que corre antes de esta comprobación.
create policy "editar perfil propio, admin o aprobacion" on public.profiles
for update to authenticated
using (
  id = auth.uid()
  or public.current_user_role() in ('administrador', 'owner')
  or (public.current_user_role()::text = 'lider' and approval_status = 'pendiente')
)
with check (
  id = auth.uid()
  or public.current_user_role() in ('administrador', 'owner')
  or public.current_user_role()::text = 'lider'
);

-- ── RLS: una cuenta pendiente no ve ni toca nada ─────────────────────────

drop policy "usuarios autenticados ven capacitaciones" on public.trainings;

create policy "usuarios aprobados ven capacitaciones" on public.trainings
for select to authenticated
using (public.current_user_is_approved());

drop policy "registrar asistencia propia" on public.attendance;

create policy "registrar asistencia propia" on public.attendance
for insert to authenticated
with check (user_id = auth.uid() and public.current_user_is_approved());

drop policy "insertar progreso propio" on public.watch_progress;

create policy "insertar progreso propio" on public.watch_progress
for insert to authenticated
with check (user_id = auth.uid() and public.current_user_is_approved());

drop policy "actualizar progreso propio" on public.watch_progress;

create policy "actualizar progreso propio" on public.watch_progress
for update to authenticated
using (user_id = auth.uid() and public.current_user_is_approved())
with check (user_id = auth.uid() and public.current_user_is_approved());

drop policy "usuarios ven examenes publicados" on public.exams;

create policy "usuarios ven examenes publicados" on public.exams
for select to authenticated
using (
  (is_published and public.current_user_is_approved())
  or public.current_user_role() in ('administrador', 'owner')
);

-- `training_areas` (clasificación de capacitaciones por área) existe en el
-- proyecto pero su migración nunca se versionó en el repo, así que se ajusta
-- solo si está: la misma regla debe valer en producción y en un esquema
-- levantado desde cero con estas migraciones.
do $$
begin
  if to_regclass('public.training_areas') is not null then
    drop policy if exists "usuarios autenticados ven la clasificacion"
      on public.training_areas;
    create policy "usuarios aprobados ven la clasificacion" on public.training_areas
    for select to authenticated
    using (public.current_user_is_approved());
  end if;
end $$;

-- Los intentos de examen se crean desde RPC SECURITY DEFINER, que se saltan la
-- RLS; el trigger sí corre, así que la guarda de aprobación vive aquí.
-- Bloquear el alta basta: no hay forma de entregar un intento que no existe.

create or replace function public.enforce_approved_actor()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.current_user_is_approved() then
    raise exception 'Tu registro todavia esta pendiente de aprobacion';
  end if;
  return new;
end;
$$;

create trigger trg_exam_attempts_approved
before insert on public.exam_attempts
for each row execute function public.enforce_approved_actor();

-- ── Check-in por QR ──────────────────────────────────────────────────────
-- La aprobación se revisa antes de buscar la capacitación: al ser SECURITY
-- INVOKER, para una cuenta pendiente la tabla viene vacía y el resultado sería
-- un confuso 'invalid_token'.

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

  if not public.current_user_is_approved() then
    return query select 'not_approved'::text, null::text;
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

-- ── Endurecimiento (advisors) ────────────────────────────────────────────
-- Las funciones de trigger no deben ser invocables vía la API REST.
-- current_user_is_approved conserva EXECUTE por la misma razón que
-- current_user_role: las políticas RLS la evalúan con los privilegios del rol
-- consultante y para anon devuelve false.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_changes() from public, anon, authenticated;
revoke execute on function public.enforce_approved_actor() from public, anon, authenticated;
