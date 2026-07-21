-- Catálogos administrables y perfiles de usuario con roles.

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sucursales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create type public.user_role as enum ('owner', 'administrador', 'usuario');
create type public.auth_method_type as enum ('email', 'username');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  username text unique,
  auth_method public.auth_method_type not null default 'email',
  area_id uuid references public.areas(id),
  sucursal_id uuid references public.sucursales(id),
  role public.user_role not null default 'usuario',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_area on public.profiles(area_id);
create index idx_profiles_sucursal on public.profiles(sucursal_id);

-- Rol del usuario autenticado actual. SECURITY DEFINER para evitar
-- recursión de RLS cuando otras políticas consultan profiles.
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Valida el dominio del correo según el método de registro declarado.
-- Cuentas con correo real: solo @clarvi.com. Cuentas por usuario: solo el
-- dominio sintético reservado @users.internal.clarvi (no enrutable).
create or replace function public.enforce_signup_email_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_method text := coalesce(new.raw_user_meta_data->>'signup_method', 'email');
begin
  if v_method = 'username' then
    if new.email !~* '^[a-z0-9._-]+@users\.internal\.clarvi$' then
      raise exception 'Registro por usuario invalido';
    end if;
  else
    if new.email !~* '^[^@\s]+@clarvi\.com$' then
      raise exception 'El correo debe ser del dominio @clarvi.com';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_signup_email_rules
before insert on auth.users
for each row execute function public.enforce_signup_email_rules();

-- Crea la fila de profiles al registrarse, a partir de raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, username, auth_method, area_id, sucursal_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Sin nombre'),
    case when coalesce(new.raw_user_meta_data->>'signup_method', 'email') = 'email' then new.email end,
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    case
      when coalesce(new.raw_user_meta_data->>'signup_method', 'email') = 'username'
        then 'username'::public.auth_method_type
      else 'email'::public.auth_method_type
    end,
    nullif(new.raw_user_meta_data->>'area_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'sucursal_id', '')::uuid
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Guarda de columnas sensibles de profiles:
--  - role: solo el owner puede cambiarlo (y no puede quitarse el suyo)
--  - is_active: solo administrador/owner
--  - username/auth_method: inmutables (el login por usuario depende de ellos)
--  - filas de owner: solo editables por un owner o por sí mismo
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
begin
  if v_actor is null then
    return new; -- service role / procesos internos
  end if;
  v_actor_role := public.current_user_role();

  if new.username is distinct from old.username then
    raise exception 'El nombre de usuario no se puede cambiar';
  end if;
  if new.auth_method is distinct from old.auth_method or new.email is distinct from old.email then
    raise exception 'El metodo de acceso no se puede cambiar';
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

create trigger trg_guard_profile_changes
before update on public.profiles
for each row execute function public.guard_profile_changes();
