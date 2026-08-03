-- El mensaje de "sin intentos" se redactaba con el número dentro ("Ya usaste
-- tus 1 intentos"), que se lee mal en singular. Se cambia por uno que no
-- depende de la cantidad; la UI ya muestra el conteo por separado.

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
      raise exception 'Ya no tienes intentos disponibles para este examen';
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
