-- Alta de capacitaciones **desde la transmisión**, no al revés.
--
-- El flujo que resuelve: el instructor abre el directo en YouTube y el admin
-- pulsa "Revisar canal" en la plataforma. Si el canal está al aire, se leen los
-- datos del directo (título, video, miniatura) y **se crea sola la
-- capacitación**. Ya no hay que capturar la tarjeta a mano antes de la sesión.
--
-- Esta migración pone las tres piezas que faltaban:
--   1. dónde vive el canal de la empresa (se configura una vez, no por
--      capacitación),
--   2. la garantía de que un mismo directo no genere dos tarjetas,
--   3. el aviso de "está en vivo" también cuando la capacitación **nace** al
--      aire (antes solo se disparaba al pasar de programada a en vivo).

-- ── Ajustes de la plataforma ─────────────────────────────────────────────
-- Tabla llave/valor a propósito: hoy solo guarda el canal, y crear una tabla
-- por cada ajuste suelto no se paga. Lo que se guarda aquí es configuración de
-- la empresa, no secretos: la llave del canal es un link público.

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

comment on table public.app_settings is
  'Ajustes de la plataforma (llave/valor). Los lee cualquiera con sesión; solo admin/owner los escribe.';

alter table public.app_settings enable row level security;

drop policy if exists "leer ajustes" on public.app_settings;
create policy "leer ajustes" on public.app_settings
for select to authenticated
using (true);

drop policy if exists "admin administra ajustes" on public.app_settings;
create policy "admin administra ajustes" on public.app_settings
for all to authenticated
using (public.current_user_role() in ('administrador', 'owner'))
with check (public.current_user_role() in ('administrador', 'owner'));

-- La fila existe desde ya (con valor vacío) para que la pantalla de
-- administración tenga qué editar sin inventarse la primera inserción.
insert into public.app_settings (key, value)
values ('youtube_channel_url', null)
on conflict (key) do nothing;

comment on column public.app_settings.value is
  'youtube_channel_url: canal del que se leen las transmisiones (https://www.youtube.com/@…).';

-- ── Un directo, una capacitación ─────────────────────────────────────────
-- "Revisar canal" es un botón: se va a pulsar dos veces seguidas. Sin esto,
-- la segunda pulsación crearía una tarjeta duplicada de la misma transmisión.

create unique index if not exists uq_trainings_live_video
  on public.trainings(live_video_id)
  where live_video_id is not null;

-- ── Aviso cuando la capacitación nace al aire ────────────────────────────
-- El disparador anterior era solo AFTER UPDATE: servía para la transmisión que
-- se activaba sobre una capacitación existente. Ahora la capacitación puede
-- nacer ya `en_vivo`, y ese caso también tiene que avisar.

drop trigger if exists trg_notify_live_started_ins on public.trainings;
create trigger trg_notify_live_started_ins
after insert on public.trainings
for each row
when (new.live_status = 'en_vivo')
execute function public.notify_live_started();
