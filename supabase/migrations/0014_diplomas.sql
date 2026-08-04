-- Diplomas por capacitación cursada.
--
-- Se otorgan solos al cumplir el requisito de la capacitación:
--   · con examen publicado  → aprobarlo;
--   · sin examen            → completar el video (el 90% de siempre).
--
-- El diploma **congela** los datos con los que se emite (nombre, título de la
-- capacitación, área, sucursal, calificación), igual que `attendance` congela
-- área/sucursal y cada respuesta guarda su `question_snapshot`: renombrar un
-- área o corregir el título de la capacitación después no reescribe un
-- documento ya entregado.
--
-- La interfaz todavía no lo muestra (bandera `FEATURES.diplomas` en el
-- frontend); la infraestructura ya emite y acumula los diplomas para que el
-- día que se encienda no arranque vacía.

create sequence public.certificates_folio_seq;

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  folio text not null unique,
  earned_via text not null check (earned_via in ('examen', 'video')),
  score_percent numeric,
  earned_at timestamptz not null default now(),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (training_id, user_id)
);

create index idx_certificates_user on public.certificates(user_id, earned_at desc);
create index idx_certificates_training on public.certificates(training_id);

comment on table public.certificates is
  'Un diploma por persona y capacitación. Solo lo escribe grant_certificate_if_earned.';
comment on column public.certificates.snapshot is
  'Datos congelados al emitir: full_name, training_title, session_date, area, sucursal.';

alter table public.certificates enable row level security;

create policy "leer diplomas propios o admin" on public.certificates
for select to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('administrador', 'owner'));

-- Sin políticas de escritura: los diplomas los emite el servidor.

-- ── Emisión ──────────────────────────────────────────────────────────────

create or replace function public.next_certificate_folio()
returns text
language sql volatile set search_path = ''
as $$
  select 'CLARVI-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.certificates_folio_seq')::text, 5, '0');
$$;

-- Idempotente: si la persona ya tiene el diploma de esa capacitación, no pasa
-- nada. Devuelve el id del diploma cuando lo emite, null si todavía no toca.
create or replace function public.grant_certificate_if_earned(
  p_training_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_training public.trainings%rowtype;
  v_exam_id uuid;
  v_via text;
  v_score numeric;
  v_earned_at timestamptz;
  v_id uuid;
begin
  if p_training_id is null or p_user_id is null then
    return null;
  end if;

  select id into v_id from public.certificates
  where training_id = p_training_id and user_id = p_user_id;
  if v_id is not null then
    return null;
  end if;

  select * into v_training from public.trainings where id = p_training_id;
  if not found then
    return null;
  end if;

  select id into v_exam_id from public.exams
  where training_id = p_training_id and is_published;

  if v_exam_id is not null then
    -- Con examen publicado manda el examen: se gana la primera vez que se
    -- aprueba y se imprime la mejor calificación obtenida.
    select max(score_percent), min(submitted_at)
      into v_score, v_earned_at
    from public.exam_attempts
    where exam_id = v_exam_id and user_id = p_user_id and passed;
    if v_earned_at is null then
      return null;
    end if;
    v_via := 'examen';
  else
    select completed_at into v_earned_at
    from public.watch_progress
    where training_id = p_training_id and user_id = p_user_id;
    if v_earned_at is null then
      return null;
    end if;
    v_via := 'video';
  end if;

  insert into public.certificates (
    training_id, user_id, folio, earned_via, score_percent, earned_at, snapshot
  )
  select
    p_training_id,
    p_user_id,
    public.next_certificate_folio(),
    v_via,
    v_score,
    v_earned_at,
    jsonb_build_object(
      'full_name', pr.full_name,
      'training_title', v_training.title,
      'session_date', v_training.session_date,
      'area', a.nombre,
      'sucursal', s.nombre
    )
  from public.profiles pr
  left join public.areas a on a.id = pr.area_id
  left join public.sucursales s on s.id = pr.sucursal_id
  where pr.id = p_user_id
  on conflict (training_id, user_id) do nothing
  returning id into v_id;

  -- A propósito no manda notificación: mientras la interfaz no muestre los
  -- diplomas, avisar de uno sería mandar a la gente a una pantalla que no
  -- existe. Al encender `FEATURES.diplomas` conviene agregar aquí el aviso.
  return v_id;
end;
$$;

-- ── Disparadores ─────────────────────────────────────────────────────────
-- Las cláusulas WHEN son la parte importante: `upsert_watch_progress` escribe
-- cada ~15 segundos de reproducción, así que el disparador tiene que sonar
-- exactamente cuando se acredita, no en cada latido. Como WHEN no puede
-- mirar OLD en un INSERT, va un disparador por operación.

create or replace function public.grant_certificate_on_exam()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_training_id uuid;
begin
  select training_id into v_training_id from public.exams where id = new.exam_id;
  perform public.grant_certificate_if_earned(v_training_id, new.user_id);
  return new;
end;
$$;

create trigger trg_grant_certificate_on_exam_ins
after insert on public.exam_attempts
for each row
when (new.passed and new.submitted_at is not null)
execute function public.grant_certificate_on_exam();

create trigger trg_grant_certificate_on_exam_upd
after update on public.exam_attempts
for each row
when (new.passed and new.submitted_at is not null and old.passed is distinct from true)
execute function public.grant_certificate_on_exam();

create or replace function public.grant_certificate_on_watch()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.grant_certificate_if_earned(new.training_id, new.user_id);
  return new;
end;
$$;

create trigger trg_grant_certificate_on_watch_ins
after insert on public.watch_progress
for each row
when (new.completed_at is not null)
execute function public.grant_certificate_on_watch();

create trigger trg_grant_certificate_on_watch_upd
after update on public.watch_progress
for each row
when (new.completed_at is not null and old.completed_at is null)
execute function public.grant_certificate_on_watch();

-- ── Verificación pública ─────────────────────────────────────────────────
-- Para el folio impreso en el diploma: confirma que existe y de qué es, sin
-- exponer la tabla ni el resto de los datos de la persona.

create or replace function public.certificate_by_folio(p_folio text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'folio', c.folio,
    'full_name', c.snapshot->>'full_name',
    'training_title', c.snapshot->>'training_title',
    'earned_at', c.earned_at
  )
  from public.certificates c
  where c.folio = upper(btrim(p_folio));
$$;

-- ── Diplomas de quienes ya cumplieron ────────────────────────────────────
-- Para no arrancar en blanco: se emiten con la fecha real en que se ganaron.

do $$
declare
  r record;
begin
  for r in
    select distinct e.training_id, ea.user_id
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    where ea.passed and ea.submitted_at is not null
    union
    select wp.training_id, wp.user_id
    from public.watch_progress wp
    where wp.completed_at is not null
  loop
    perform public.grant_certificate_if_earned(r.training_id, r.user_id);
  end loop;
end $$;

-- ── Endurecimiento (advisors) ────────────────────────────────────────────
-- certificate_by_folio conserva EXECUTE: es la verificación pública del folio.

revoke execute on function public.grant_certificate_if_earned(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.grant_certificate_on_exam() from public, anon, authenticated;
revoke execute on function public.grant_certificate_on_watch() from public, anon, authenticated;
revoke execute on function public.next_certificate_folio() from public, anon, authenticated;
