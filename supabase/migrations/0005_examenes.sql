-- Módulo de exámenes: constructor por capacitación (admin), aplicación una
-- pregunta a la vez (usuario) y medición de quién lo presentó.
--
-- Principio: la respuesta correcta nunca sale del servidor hacia un usuario.
-- `exam_questions` (que guarda `answer_key`) solo es legible por admin/owner;
-- el usuario recibe las preguntas saneadas y barajadas por funciones
-- `security definer`, y la calificación se calcula aquí, no en el navegador.

create type public.question_type as enum (
  'multiple_choice',  -- una sola opción correcta
  'multiple_select',  -- varias opciones correctas
  'true_false',
  'matching',         -- relacionar conceptos
  'ordering',         -- ordenar pasos
  'fill_blank'        -- completar frases
);

-- Un examen por capacitación. Nace despublicado: mientras se arma no es
-- visible para los usuarios.
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null unique references public.trainings(id) on delete cascade,
  title text,
  instructions text,
  passing_percent numeric not null default 80
    check (passing_percent >= 0 and passing_percent <= 100),
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  requires_video_completed boolean not null default false,
  shuffle_questions boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_exams_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

-- content: lo que se le muestra al usuario. answer_key: la respuesta correcta.
-- Forma por tipo (la valida assert_question_shape):
--   multiple_choice  content {options:[{id,text}]}          key {option_id}
--   multiple_select  content {options:[{id,text}]}          key {option_ids:[…]}
--   true_false       content {}                             key {value: true|false}
--   matching         content {left:[{id,text}],right:[…]}   key {pairs:{left_id: right_id}}
--   ordering         content {items:[{id,text}]} (correcto) key {order:[id,…]}
--   fill_blank       content {text,blanks:[{id}],word_bank} key {blanks:{id:[acepta,…]}}
create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  position integer not null,
  type public.question_type not null,
  prompt text not null,
  points numeric not null default 1 check (points > 0),
  content jsonb not null default '{}'::jsonb,
  answer_key jsonb not null default '{}'::jsonb,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- deferrable: reordenar preguntas dentro de una transacción pasa por
  -- estados con posiciones repetidas.
  constraint exam_questions_position_unique unique (exam_id, position)
    deferrable initially deferred
);

create index idx_exam_questions_exam on public.exam_questions(exam_id, position);

create trigger trg_exam_questions_updated_at
before update on public.exam_questions
for each row execute function public.set_updated_at();

-- Un renglón por intento. Se crea al abrir el examen y se cierra al entregar;
-- un intento sin `submitted_at` es uno abierto (se reanuda, no se duplica).
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_number integer not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  score_percent numeric generated always as (
    round(score / nullif(max_score, 0) * 100, 2)
  ) stored,
  passed boolean,
  unique (exam_id, user_id, attempt_number)
);

create index idx_exam_attempts_exam on public.exam_attempts(exam_id);
create index idx_exam_attempts_user on public.exam_attempts(user_id);

-- question_snapshot congela enunciado, opciones y respuesta correcta del
-- momento en que se contestó: si el admin edita o borra la pregunta después,
-- el reporte histórico no cambia (mismo criterio que area/sucursal en
-- attendance).
create table public.exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid references public.exam_questions(id) on delete set null,
  question_snapshot jsonb not null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean not null default false,
  points_awarded numeric not null default 0,
  unique (attempt_id, question_id)
);

create index idx_exam_attempt_answers_attempt on public.exam_attempt_answers(attempt_id);
create index idx_exam_attempt_answers_question on public.exam_attempt_answers(question_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_answers enable row level security;

create policy "usuarios ven examenes publicados" on public.exams
for select to authenticated
using (is_published or public.current_user_role() in ('administrador', 'owner'));

create policy "admin administra examenes" on public.exams
for all to authenticated
using (public.current_user_role() in ('administrador', 'owner'))
with check (public.current_user_role() in ('administrador', 'owner'));

-- Sin política de lectura para usuarios: las preguntas llevan la respuesta
-- correcta. El usuario las recibe saneadas vía start_exam_attempt.
create policy "admin administra preguntas" on public.exam_questions
for all to authenticated
using (public.current_user_role() in ('administrador', 'owner'))
with check (public.current_user_role() in ('administrador', 'owner'));

-- Intentos y respuestas: solo lectura desde el cliente. Las escrituras pasan
-- por los RPC security definer, así nadie se fabrica una calificación.
create policy "leer intentos propios o admin" on public.exam_attempts
for select to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('administrador', 'owner'));

create policy "leer respuestas propias o admin" on public.exam_attempt_answers
for select to authenticated
using (
  exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id
      and (a.user_id = auth.uid()
           or public.current_user_role() in ('administrador', 'owner'))
  )
);

-- ── Helpers de calificación ──────────────────────────────────────────────

-- Normaliza texto libre para comparar respuestas de completar frases:
-- minúsculas, sin acentos y con espacios colapsados.
create or replace function public.normalize_text(p_value text)
returns text
language sql immutable set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(translate(
      coalesce(p_value, ''),
      'áàäâéèëêíìïîóòöôúùüûñçÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇ',
      'aaaaeeeeiiiioooouuuuncAAAAEEEEIIIIOOOOUUUUNC'
    )),
    '\s+', ' ', 'g'));
$$;

-- Fracción acertada de una pregunta (0 a 1). Todo-o-nada en opción múltiple
-- y verdadero/falso; crédito proporcional en los tipos con varias partes.
create or replace function public.grade_answer(
  p_type public.question_type,
  p_content jsonb,
  p_answer_key jsonb,
  p_response jsonb
)
returns numeric
language plpgsql immutable set search_path = ''
as $$
declare
  v_key_ids text[];
  v_resp_ids text[];
  v_total integer := 0;
  v_hits integer := 0;
  v_wrong integer := 0;
  v_row record;
  v_accepted jsonb;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' then
    return 0;
  end if;

  if p_type = 'multiple_choice' then
    return case
      when p_response->>'option_id' is not null
       and p_response->>'option_id' = p_answer_key->>'option_id' then 1
      else 0
    end;

  elsif p_type = 'true_false' then
    return case
      when p_response->>'value' is not null
       and p_response->>'value' = p_answer_key->>'value' then 1
      else 0
    end;

  elsif p_type = 'multiple_select' then
    select coalesce(array_agg(distinct value), '{}')
      into v_key_ids
      from jsonb_array_elements_text(
        case when jsonb_typeof(p_answer_key->'option_ids') = 'array'
             then p_answer_key->'option_ids' else '[]'::jsonb end);
    if coalesce(array_length(v_key_ids, 1), 0) = 0 then
      return 0;
    end if;
    select coalesce(array_agg(distinct value), '{}')
      into v_resp_ids
      from jsonb_array_elements_text(
        case when jsonb_typeof(p_response->'option_ids') = 'array'
             then p_response->'option_ids' else '[]'::jsonb end);
    select count(*) filter (where x = any (v_key_ids)),
           count(*) filter (where not (x = any (v_key_ids)))
      into v_hits, v_wrong
      from unnest(v_resp_ids) as x;
    return greatest(0, (v_hits - v_wrong)::numeric / array_length(v_key_ids, 1));

  elsif p_type = 'matching' then
    select count(*),
           count(*) filter (where p_response->'pairs'->>kv.k = kv.v)
      into v_total, v_hits
      from jsonb_each_text(
        case when jsonb_typeof(p_answer_key->'pairs') = 'object'
             then p_answer_key->'pairs' else '{}'::jsonb end) as kv(k, v);
    if v_total = 0 then return 0; end if;
    return v_hits::numeric / v_total;

  elsif p_type = 'ordering' then
    select count(*),
           count(*) filter (where p_response->'order'->>((idx - 1)::int) = val)
      into v_total, v_hits
      from jsonb_array_elements_text(
        case when jsonb_typeof(p_answer_key->'order') = 'array'
             then p_answer_key->'order' else '[]'::jsonb end)
        with ordinality as t(val, idx);
    if v_total = 0 then return 0; end if;
    return v_hits::numeric / v_total;

  elsif p_type = 'fill_blank' then
    for v_row in
      select key as blank_id, value as accepted
      from jsonb_each(
        case when jsonb_typeof(p_answer_key->'blanks') = 'object'
             then p_answer_key->'blanks' else '{}'::jsonb end)
    loop
      v_total := v_total + 1;
      v_accepted := case
        when jsonb_typeof(v_row.accepted) = 'array' then v_row.accepted
        else jsonb_build_array(v_row.accepted)
      end;
      if exists (
        select 1
        from jsonb_array_elements_text(v_accepted) as a(value)
        where public.normalize_text(a.value) <> ''
          and public.normalize_text(a.value)
              = public.normalize_text(p_response->'blanks'->>v_row.blank_id)
      ) then
        v_hits := v_hits + 1;
      end if;
    end loop;
    if v_total = 0 then return 0; end if;
    return v_hits::numeric / v_total;
  end if;

  return 0;
end;
$$;

-- Valida que una pregunta esté bien armada antes de guardarla. La llama
-- save_exam, que es security invoker: por eso conserva EXECUTE para
-- authenticated (es pura, solo revisa el payload que el propio admin envía).
create or replace function public.assert_question_shape(
  p_type public.question_type,
  p_content jsonb,
  p_answer_key jsonb
)
returns void
language plpgsql immutable set search_path = ''
as $$
declare
  v_ids text[];
  v_right_ids text[];
  v_key_ids text[];
begin
  if p_type in ('multiple_choice', 'multiple_select') then
    select coalesce(array_agg(value->>'id'), '{}') into v_ids
      from jsonb_array_elements(
        case when jsonb_typeof(p_content->'options') = 'array'
             then p_content->'options' else '[]'::jsonb end)
      where btrim(coalesce(value->>'text', '')) <> ''
        and coalesce(value->>'id', '') <> '';
    if coalesce(array_length(v_ids, 1), 0) < 2 then
      raise exception 'Cada pregunta de opciones necesita al menos 2 opciones con texto';
    end if;
    if p_type = 'multiple_choice' then
      if p_answer_key->>'option_id' is null
         or not (p_answer_key->>'option_id' = any (v_ids)) then
        raise exception 'Marca cuál es la opción correcta';
      end if;
    else
      select coalesce(array_agg(value), '{}') into v_key_ids
        from jsonb_array_elements_text(
          case when jsonb_typeof(p_answer_key->'option_ids') = 'array'
               then p_answer_key->'option_ids' else '[]'::jsonb end);
      if coalesce(array_length(v_key_ids, 1), 0) = 0 then
        raise exception 'Marca al menos una opción correcta';
      end if;
      if exists (select 1 from unnest(v_key_ids) x where not (x = any (v_ids))) then
        raise exception 'Hay respuestas correctas que no corresponden a ninguna opción';
      end if;
    end if;

  elsif p_type = 'true_false' then
    if jsonb_typeof(p_answer_key->'value') <> 'boolean' then
      raise exception 'Indica si el enunciado es verdadero o falso';
    end if;

  elsif p_type = 'matching' then
    select coalesce(array_agg(value->>'id'), '{}') into v_ids
      from jsonb_array_elements(
        case when jsonb_typeof(p_content->'left') = 'array'
             then p_content->'left' else '[]'::jsonb end)
      where btrim(coalesce(value->>'text', '')) <> ''
        and coalesce(value->>'id', '') <> '';
    select coalesce(array_agg(value->>'id'), '{}') into v_right_ids
      from jsonb_array_elements(
        case when jsonb_typeof(p_content->'right') = 'array'
             then p_content->'right' else '[]'::jsonb end)
      where btrim(coalesce(value->>'text', '')) <> ''
        and coalesce(value->>'id', '') <> '';
    if coalesce(array_length(v_ids, 1), 0) < 2
       or coalesce(array_length(v_right_ids, 1), 0) < 2 then
      raise exception 'Relacionar conceptos necesita al menos 2 conceptos de cada lado';
    end if;
    if exists (
      select 1 from unnest(v_ids) x
      where p_answer_key->'pairs'->>x is null
         or not (p_answer_key->'pairs'->>x = any (v_right_ids))
    ) then
      raise exception 'Cada concepto de la izquierda necesita su pareja';
    end if;

  elsif p_type = 'ordering' then
    select coalesce(array_agg(value->>'id'), '{}') into v_ids
      from jsonb_array_elements(
        case when jsonb_typeof(p_content->'items') = 'array'
             then p_content->'items' else '[]'::jsonb end)
      where btrim(coalesce(value->>'text', '')) <> ''
        and coalesce(value->>'id', '') <> '';
    if coalesce(array_length(v_ids, 1), 0) < 2 then
      raise exception 'Ordenar pasos necesita al menos 2 pasos con texto';
    end if;
    select coalesce(array_agg(value), '{}') into v_key_ids
      from jsonb_array_elements_text(
        case when jsonb_typeof(p_answer_key->'order') = 'array'
             then p_answer_key->'order' else '[]'::jsonb end);
    if coalesce(array_length(v_key_ids, 1), 0) <> array_length(v_ids, 1)
       or exists (select 1 from unnest(v_ids) x where not (x = any (v_key_ids))) then
      raise exception 'El orden correcto debe incluir todos los pasos una sola vez';
    end if;

  elsif p_type = 'fill_blank' then
    select coalesce(array_agg(value->>'id'), '{}') into v_ids
      from jsonb_array_elements(
        case when jsonb_typeof(p_content->'blanks') = 'array'
             then p_content->'blanks' else '[]'::jsonb end)
      where coalesce(value->>'id', '') <> '';
    if coalesce(array_length(v_ids, 1), 0) = 0 then
      raise exception 'Marca al menos un hueco en la frase con {{1}}';
    end if;
    if exists (
      select 1 from unnest(v_ids) x
      where not exists (
        select 1
        from jsonb_array_elements_text(
          case when jsonb_typeof(p_answer_key->'blanks'->x) = 'array'
               then p_answer_key->'blanks'->x else '[]'::jsonb end) as a(value)
        where public.normalize_text(a.value) <> ''
      )
    ) then
      raise exception 'Cada hueco necesita al menos una respuesta aceptada';
    end if;
  end if;
end;
$$;

-- ── RPC: guardar el examen (admin) ───────────────────────────────────────
-- security invoker: autorizan las políticas de exams/exam_questions.
-- Reconcilia preguntas por id (actualiza, inserta y borra las que faltan) en
-- vez de recrearlas, para no romper ids en uso.

create or replace function public.save_exam(
  p_training_id uuid,
  p_exam jsonb,
  p_questions jsonb
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_exam_id uuid;
  v_kept uuid[] := '{}';
  v_q jsonb;
  v_id uuid;
  v_type public.question_type;
  v_pos integer := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'Preguntas invalidas';
  end if;

  insert into public.exams as e (
    training_id, title, instructions, passing_percent, max_attempts,
    requires_video_completed, shuffle_questions, is_published, created_by
  )
  values (
    p_training_id,
    nullif(btrim(coalesce(p_exam->>'title', '')), ''),
    nullif(btrim(coalesce(p_exam->>'instructions', '')), ''),
    coalesce((p_exam->>'passing_percent')::numeric, 80),
    nullif(p_exam->>'max_attempts', '')::integer,
    coalesce((p_exam->>'requires_video_completed')::boolean, false),
    coalesce((p_exam->>'shuffle_questions')::boolean, false),
    coalesce((p_exam->>'is_published')::boolean, false),
    auth.uid()
  )
  on conflict (training_id) do update set
    title = excluded.title,
    instructions = excluded.instructions,
    passing_percent = excluded.passing_percent,
    max_attempts = excluded.max_attempts,
    requires_video_completed = excluded.requires_video_completed,
    shuffle_questions = excluded.shuffle_questions,
    is_published = excluded.is_published
  returning e.id into v_exam_id;

  for v_q in select * from jsonb_array_elements(p_questions) loop
    v_pos := v_pos + 1;
    v_type := (v_q->>'type')::public.question_type;

    if btrim(coalesce(v_q->>'prompt', '')) = '' then
      raise exception 'La pregunta % no tiene enunciado', v_pos;
    end if;
    perform public.assert_question_shape(
      v_type, coalesce(v_q->'content', '{}'::jsonb), coalesce(v_q->'answer_key', '{}'::jsonb));

    v_id := nullif(v_q->>'id', '')::uuid;
    if v_id is not null and exists (
      select 1 from public.exam_questions q
      where q.id = v_id and q.exam_id = v_exam_id
    ) then
      update public.exam_questions set
        position = v_pos,
        type = v_type,
        prompt = btrim(v_q->>'prompt'),
        points = coalesce((v_q->>'points')::numeric, 1),
        content = coalesce(v_q->'content', '{}'::jsonb),
        answer_key = coalesce(v_q->'answer_key', '{}'::jsonb),
        explanation = nullif(btrim(coalesce(v_q->>'explanation', '')), '')
      where id = v_id;
    else
      insert into public.exam_questions (
        exam_id, position, type, prompt, points, content, answer_key, explanation
      )
      values (
        v_exam_id, v_pos, v_type, btrim(v_q->>'prompt'),
        coalesce((v_q->>'points')::numeric, 1),
        coalesce(v_q->'content', '{}'::jsonb),
        coalesce(v_q->'answer_key', '{}'::jsonb),
        nullif(btrim(coalesce(v_q->>'explanation', '')), '')
      )
      returning id into v_id;
    end if;

    v_kept := v_kept || v_id;
  end loop;

  delete from public.exam_questions q
  where q.exam_id = v_exam_id and not (q.id = any (v_kept));

  return v_exam_id;
end;
$$;

-- ── Saneado de preguntas para el usuario ─────────────────────────────────

create or replace function public.shuffle_jsonb_array(p_items jsonb)
returns jsonb
language sql volatile set search_path = ''
as $$
  select coalesce(jsonb_agg(value order by random()), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end);
$$;

-- Devuelve solo lo que el usuario debe ver. `ordering` y la columna derecha
-- de `matching` se barajan siempre: en el content están en el orden correcto.
create or replace function public.public_question_content(
  p_type public.question_type,
  p_content jsonb,
  p_shuffle boolean
)
returns jsonb
language sql volatile set search_path = ''
as $$
  select case p_type
    when 'multiple_choice' then jsonb_build_object(
      'options', case when p_shuffle
        then public.shuffle_jsonb_array(p_content->'options')
        else coalesce(p_content->'options', '[]'::jsonb) end)
    when 'multiple_select' then jsonb_build_object(
      'options', case when p_shuffle
        then public.shuffle_jsonb_array(p_content->'options')
        else coalesce(p_content->'options', '[]'::jsonb) end)
    when 'true_false' then '{}'::jsonb
    when 'matching' then jsonb_build_object(
      'left', case when p_shuffle
        then public.shuffle_jsonb_array(p_content->'left')
        else coalesce(p_content->'left', '[]'::jsonb) end,
      'right', public.shuffle_jsonb_array(p_content->'right'))
    when 'ordering' then jsonb_build_object(
      'items', public.shuffle_jsonb_array(p_content->'items'))
    when 'fill_blank' then jsonb_build_object(
      'text', coalesce(p_content->'text', '""'::jsonb),
      'blanks', coalesce(p_content->'blanks', '[]'::jsonb),
      'word_bank', public.shuffle_jsonb_array(p_content->'word_bank'))
    else '{}'::jsonb
  end;
$$;

-- ── RPC: estado del examen para el usuario ───────────────────────────────
-- Alimenta el botón "Aplicar examen". No incluye preguntas.

create or replace function public.exam_status_for_training(p_training_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_exam public.exams%rowtype;
  v_is_admin boolean;
  v_questions integer := 0;
  v_points numeric := 0;
  v_used integer := 0;
  v_best numeric;
  v_passed boolean;
  v_open uuid;
  v_watch numeric;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_exam from public.exams where training_id = p_training_id;
  if not found then
    return jsonb_build_object('has_exam', false);
  end if;

  v_is_admin := public.current_user_role() in ('administrador', 'owner');

  select count(*), coalesce(sum(points), 0) into v_questions, v_points
  from public.exam_questions where exam_id = v_exam.id;

  -- Un examen despublicado o vacío simplemente no existe para el usuario.
  if (not v_exam.is_published or v_questions = 0) and not v_is_admin then
    return jsonb_build_object('has_exam', false);
  end if;

  select count(*), max(score_percent), bool_or(passed)
    into v_used, v_best, v_passed
  from public.exam_attempts
  where exam_id = v_exam.id and user_id = auth.uid() and submitted_at is not null;

  select id into v_open
  from public.exam_attempts
  where exam_id = v_exam.id and user_id = auth.uid() and submitted_at is null
  order by started_at desc
  limit 1;

  if not v_exam.is_published or v_questions = 0 then
    v_reason := 'not_published';
  elsif v_exam.requires_video_completed then
    select coalesce(watch_percent, 0) into v_watch
    from public.watch_progress
    where training_id = p_training_id and user_id = auth.uid();
    if coalesce(v_watch, 0) < 90 then
      v_reason := 'video_incomplete';
    end if;
  end if;

  if v_reason is null
     and v_exam.max_attempts is not null
     and v_used >= v_exam.max_attempts
     and v_open is null then
    v_reason := 'no_attempts_left';
  end if;

  return jsonb_build_object(
    'has_exam', true,
    'exam_id', v_exam.id,
    'is_published', v_exam.is_published,
    'title', v_exam.title,
    'instructions', v_exam.instructions,
    'question_count', v_questions,
    'total_points', v_points,
    'passing_percent', v_exam.passing_percent,
    'max_attempts', v_exam.max_attempts,
    'requires_video_completed', v_exam.requires_video_completed,
    'attempts_used', v_used,
    'best_percent', v_best,
    'passed', coalesce(v_passed, false),
    'open_attempt_id', v_open,
    'can_attempt', v_reason is null,
    'block_reason', v_reason
  );
end;
$$;

-- ── RPC: abrir el examen ─────────────────────────────────────────────────
-- Devuelve las preguntas saneadas (sin answer_key). Reutiliza el intento
-- abierto si existe: recargar la página no quema un intento.

create or replace function public.start_exam_attempt(p_training_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_exam public.exams%rowtype;
  v_questions integer;
  v_attempt_id uuid;
  v_used integer;
  v_next integer;
  v_watch numeric;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_exam from public.exams where training_id = p_training_id;
  if not found or not v_exam.is_published then
    raise exception 'El examen no está disponible';
  end if;

  select count(*) into v_questions
  from public.exam_questions where exam_id = v_exam.id;
  if v_questions = 0 then
    raise exception 'El examen todavía no tiene preguntas';
  end if;

  if v_exam.requires_video_completed then
    select coalesce(watch_percent, 0) into v_watch
    from public.watch_progress
    where training_id = p_training_id and user_id = auth.uid();
    if coalesce(v_watch, 0) < 90 then
      raise exception 'Necesitas terminar el video antes de aplicar el examen';
    end if;
  end if;

  select id into v_attempt_id
  from public.exam_attempts
  where exam_id = v_exam.id and user_id = auth.uid() and submitted_at is null
  order by started_at desc
  limit 1;

  if v_attempt_id is null then
    select count(*) filter (where submitted_at is not null),
           coalesce(max(attempt_number), 0) + 1
      into v_used, v_next
    from public.exam_attempts
    where exam_id = v_exam.id and user_id = auth.uid();

    if v_exam.max_attempts is not null and v_used >= v_exam.max_attempts then
      raise exception 'Ya usaste tus % intentos', v_exam.max_attempts;
    end if;

    insert into public.exam_attempts (exam_id, user_id, attempt_number)
    values (v_exam.id, auth.uid(), v_next)
    returning id into v_attempt_id;
  end if;

  select coalesce(jsonb_agg(q.item order by q.sort_key, q.position), '[]'::jsonb)
    into v_payload
  from (
    select jsonb_build_object(
             'id', eq.id,
             'type', eq.type,
             'prompt', eq.prompt,
             'points', eq.points,
             'content', public.public_question_content(
               eq.type, eq.content, v_exam.shuffle_questions)
           ) as item,
           case when v_exam.shuffle_questions then random() else 0 end as sort_key,
           eq.position
    from public.exam_questions eq
    where eq.exam_id = v_exam.id
  ) q;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'exam_id', v_exam.id,
    'title', v_exam.title,
    'instructions', v_exam.instructions,
    'passing_percent', v_exam.passing_percent,
    'questions', v_payload
  );
end;
$$;

-- ── RPC: entregar y calificar ────────────────────────────────────────────
-- p_answers: { "<question_id>": {…respuesta…}, … }

create or replace function public.submit_exam_attempt(
  p_attempt_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_attempt public.exam_attempts%rowtype;
  v_exam public.exams%rowtype;
  v_q public.exam_questions%rowtype;
  v_response jsonb;
  v_fraction numeric;
  v_awarded numeric;
  v_score numeric := 0;
  v_max numeric := 0;
  v_percent numeric := 0;
  v_passed boolean;
  v_review jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Respuestas invalidas';
  end if;

  -- for update: dos envíos simultáneos del mismo intento se serializan y el
  -- segundo encuentra submitted_at ya puesto.
  select * into v_attempt from public.exam_attempts
  where id = p_attempt_id for update;
  if not found or v_attempt.user_id <> auth.uid() then
    raise exception 'Intento no encontrado';
  end if;
  if v_attempt.submitted_at is not null then
    raise exception 'Este intento ya fue entregado';
  end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;

  for v_q in
    select * from public.exam_questions
    where exam_id = v_attempt.exam_id
    order by position
  loop
    v_response := coalesce(p_answers -> v_q.id::text, '{}'::jsonb);
    if jsonb_typeof(v_response) <> 'object' then
      v_response := '{}'::jsonb;
    end if;

    v_fraction := public.grade_answer(v_q.type, v_q.content, v_q.answer_key, v_response);
    v_awarded := round(v_q.points * v_fraction, 4);
    v_score := v_score + v_awarded;
    v_max := v_max + v_q.points;

    insert into public.exam_attempt_answers (
      attempt_id, question_id, question_snapshot, response, is_correct, points_awarded
    )
    values (
      p_attempt_id, v_q.id,
      jsonb_build_object(
        'position', v_q.position, 'type', v_q.type, 'prompt', v_q.prompt,
        'points', v_q.points, 'content', v_q.content,
        'answer_key', v_q.answer_key, 'explanation', v_q.explanation),
      v_response, v_fraction >= 1, v_awarded
    );

    v_review := v_review || jsonb_build_object(
      'question_id', v_q.id,
      'type', v_q.type,
      'prompt', v_q.prompt,
      'content', v_q.content,
      'response', v_response,
      'correct_answer', v_q.answer_key,
      'is_correct', v_fraction >= 1,
      'points', v_q.points,
      'points_awarded', v_awarded,
      'explanation', v_q.explanation
    );
  end loop;

  if v_max > 0 then
    v_percent := round(v_score / v_max * 100, 2);
  end if;
  v_passed := v_percent >= v_exam.passing_percent;

  update public.exam_attempts set
    submitted_at = now(),
    score = v_score,
    max_score = v_max,
    passed = v_passed
  where id = p_attempt_id;

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score', v_score,
    'max_score', v_max,
    'percent', v_percent,
    'passing_percent', v_exam.passing_percent,
    'passed', v_passed,
    'review', v_review
  );
end;
$$;

-- ── Vista del dashboard ──────────────────────────────────────────────────
-- Se agregan las columnas de examen al final y se acepta la capacitación que
-- todavía no tiene video pero ya tiene examen publicado (antes quedaba
-- invisible en el dashboard).

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
where t.youtube_video_id is not null or e.id is not null;

-- ── Endurecimiento (advisors) ────────────────────────────────────────────
-- Solo se llaman desde funciones security definer; no necesitan estar
-- expuestas en la API REST. assert_question_shape y normalize_text sí
-- conservan EXECUTE: las usa save_exam, que es security invoker y por tanto
-- corre con los privilegios de quien la llama. Ambas son puras (no tocan
-- datos), así que exponerlas no revela nada.

revoke execute on function public.grade_answer(
  public.question_type, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.shuffle_jsonb_array(jsonb) from public, anon, authenticated;
revoke execute on function public.public_question_content(
  public.question_type, jsonb, boolean) from public, anon, authenticated;
