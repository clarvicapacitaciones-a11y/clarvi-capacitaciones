-- Notificaciones dentro de la plataforma.
--
-- No hay SMTP: el aviso vive en la campana del encabezado. Las escribe
-- únicamente la base de datos (funciones SECURITY DEFINER disparadas por
-- triggers); el cliente solo puede leer las suyas y marcarlas como leídas.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  subject_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id) where read_at is null;
create index idx_notifications_subject on public.notifications(type, subject_id);

comment on column public.notifications.link is
  'Ruta interna de la app (p. ej. /admin/solicitudes); no URLs externas.';
comment on column public.notifications.subject_id is
  'De qué habla el aviso (perfil, capacitación…). Permite darlo por atendido cuando otro lo resuelve.';

alter table public.notifications enable row level security;

create policy "leer notificaciones propias" on public.notifications
for select to authenticated
using (user_id = auth.uid());

create policy "marcar notificaciones propias" on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Sin política de inserción: nadie se fabrica un aviso desde el cliente.

-- Lo único editable desde el cliente es `read_at`: el resto es del servidor.
create or replace function public.guard_notification_changes()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new; -- service role / procesos internos
  end if;
  new.user_id := old.user_id;
  new.type := old.type;
  new.title := old.title;
  new.body := old.body;
  new.link := old.link;
  new.subject_id := old.subject_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger trg_guard_notification_changes
before update on public.notifications
for each row execute function public.guard_notification_changes();

-- ── Emisión ──────────────────────────────────────────────────────────────

create or replace function public.notify_users(
  p_users uuid[],
  p_type text,
  p_title text,
  p_body text,
  p_link text,
  p_subject uuid default null
)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link, subject_id)
  select u, p_type, p_title, p_body, p_link, p_subject
  from unnest(coalesce(p_users, '{}'::uuid[])) as u;
$$;

-- Nuevo registro pendiente → se avisa a los líderes de esa área (de cualquier
-- sucursal: el alcance del líder es su área). Si esa área no tiene líder, el
-- aviso va a administradores y owner para que la solicitud no se quede
-- esperando a nadie.
create or replace function public.notify_new_approval_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_recipients uuid[];
begin
  if new.approval_status <> 'pendiente' then
    return new;
  end if;

  select array_agg(p.id) into v_recipients
  from public.profiles p
  where p.role::text = 'lider'
    and p.is_active
    and p.approval_status = 'aprobado'
    and p.area_id is not null
    and p.area_id = new.area_id;

  if v_recipients is null then
    select array_agg(p.id) into v_recipients
    from public.profiles p
    where p.role in ('administrador', 'owner') and p.is_active;
  end if;

  perform public.notify_users(
    v_recipients,
    'solicitud_registro',
    'Nueva solicitud de registro',
    new.full_name || ' (@' || coalesce(new.username, '') || ') espera aprobación.',
    '/admin/solicitudes',
    new.id
  );
  return new;
end;
$$;

create trigger trg_notify_new_approval_request
after insert on public.profiles
for each row execute function public.notify_new_approval_request();

-- Solicitud resuelta → el aviso deja de estar pendiente para los demás
-- aprobadores (ya no hay nada que hacer) y quien se registró se entera.
create or replace function public.notify_approval_resolved()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.approval_status is not distinct from old.approval_status then
    return new;
  end if;

  update public.notifications
  set read_at = now()
  where type = 'solicitud_registro'
    and subject_id = new.id
    and read_at is null;

  if new.approval_status = 'aprobado' then
    perform public.notify_users(
      array[new.id],
      'registro_aprobado',
      'Tu registro fue aprobado',
      'Ya puedes ver tus capacitaciones.',
      '/dashboard',
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_approval_resolved
after update on public.profiles
for each row execute function public.notify_approval_resolved();

-- ── Endurecimiento (advisors) ────────────────────────────────────────────

revoke execute on function public.notify_users(uuid[], text, text, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.notify_new_approval_request() from public, anon, authenticated;
revoke execute on function public.notify_approval_resolved() from public, anon, authenticated;
revoke execute on function public.guard_notification_changes() from public, anon, authenticated;
