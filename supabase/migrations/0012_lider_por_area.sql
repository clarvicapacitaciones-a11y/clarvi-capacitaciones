-- Alcance del líder: solo resuelve solicitudes de su gente.
--
-- El líder manda sobre **su área, en todas las sucursales**: quien lidera
-- Comercial aprueba a los de Comercial estén en Norte, Sur o Matriz. La
-- sucursal no da alcance por sí sola — compartir edificio no es mandar sobre
-- las demás áreas de ese edificio. Administradores y owner siguen viendo todas
-- las solicitudes.
--
-- Como en la 0011, la comparación con el rol 'lider' va contra ::text para no
-- depender de que el valor del enum esté confirmado.

create or replace function public.lider_cubre(p_area_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.area_id is not null
      and me.area_id = p_area_id
  );
$$;

comment on function public.lider_cubre(uuid) is
  'Verdadero si quien consulta pertenece a esa area (el alcance del lider).';

-- ── RLS: la cola del líder se acota a su área ────────────────────────────

drop policy "leer perfil propio, admin o solicitudes" on public.profiles;

create policy "leer perfil propio, admin o solicitudes" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.current_user_role() in ('administrador', 'owner')
  or (
    public.current_user_role()::text = 'lider'
    and public.lider_cubre(area_id)
    and (approval_status <> 'aprobado' or approved_by = auth.uid())
  )
);

drop policy "editar perfil propio, admin o aprobacion" on public.profiles;

create policy "editar perfil propio, admin o aprobacion" on public.profiles
for update to authenticated
using (
  id = auth.uid()
  or public.current_user_role() in ('administrador', 'owner')
  or (
    public.current_user_role()::text = 'lider'
    and approval_status = 'pendiente'
    and public.lider_cubre(area_id)
  )
)
with check (
  id = auth.uid()
  or public.current_user_role() in ('administrador', 'owner')
  or (
    public.current_user_role()::text = 'lider'
    and public.lider_cubre(area_id)
  )
);

-- ── La misma regla en el trigger ─────────────────────────────────────────
-- Se reescribe guard_profile_changes solo para agregar la comprobación de
-- alcance del líder al resolver una solicitud.

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
    if v_actor_role = 'lider'
      and not public.lider_cubre(old.area_id) then
      raise exception 'Solo puedes resolver registros de tu area';
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

revoke execute on function public.guard_profile_changes() from public, anon, authenticated;
