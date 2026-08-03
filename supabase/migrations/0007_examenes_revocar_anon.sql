-- Los RPC de examen ya rechazan a quien no tiene sesión (`raise exception
-- 'No autenticado'`), pero seguían expuestos en /rest/v1/rpc para el rol anon.
-- Se les quita EXECUTE a anon para que ni siquiera aparezcan, y se regresa
-- explícitamente a authenticated: al revocar de PUBLIC se pierde el permiso
-- que authenticated heredaba de ahí.
--
-- training_title_for_token se queda como está: la página pública de check-in
-- la llama sin sesión a propósito.

revoke execute on function public.exam_status_for_training(uuid) from public, anon;
grant execute on function public.exam_status_for_training(uuid) to authenticated;

revoke execute on function public.start_exam_attempt(uuid) from public, anon;
grant execute on function public.start_exam_attempt(uuid) to authenticated;

revoke execute on function public.submit_exam_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_exam_attempt(uuid, jsonb) to authenticated;

-- save_exam es security invoker (las políticas RLS de exams/exam_questions la
-- autorizan), pero tampoco tiene sentido para anon.
revoke execute on function public.save_exam(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_exam(uuid, jsonb, jsonb) to authenticated;

revoke execute on function public.assert_question_shape(
  public.question_type, jsonb, jsonb) from public, anon;
grant execute on function public.assert_question_shape(
  public.question_type, jsonb, jsonb) to authenticated;

revoke execute on function public.normalize_text(text) from public, anon;
grant execute on function public.normalize_text(text) to authenticated;
