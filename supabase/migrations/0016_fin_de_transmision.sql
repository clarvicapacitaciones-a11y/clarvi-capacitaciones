-- Cierre de la transmisión: el reproductor y el admin también pueden darla
-- por terminada, no solo la lectura de la página de YouTube.
--
-- Por qué hace falta: YouTube contesta a las peticiones que salen de un centro
-- de datos con un muro anti-bot (la página llega, pero el bloque rico del
-- reproductor viene vacío, con `playabilityStatus = LOGIN_REQUIRED`). La Edge
-- Function sabe lidiar con eso —lee las señales que sí sobreviven— pero no
-- conviene que la publicación de la grabación dependa de un solo camino.
--
-- El navegador de quien está viendo la transmisión no tiene ese problema: el
-- reproductor de YouTube le dice, sin llaves ni API, cuándo terminó el
-- directo. Esta función recibe ese aviso, y es la misma que usa el botón
-- "Finalizar y publicar grabación" de la ficha de administración.
--
-- Lo que el cliente **no** manda es cuánto duró: eso lo calcula el servidor
-- con el reloj de la transmisión, para que nadie se acredite tiempo escribiendo
-- un número.

create or replace function public.finish_live_broadcast(p_training_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_training public.trainings%rowtype;
  v_is_admin boolean;
  v_duration numeric;
  v_credited integer := 0;
  v_video text;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'no_autenticado');
  end if;

  select * into v_training from public.trainings where id = p_training_id;
  if not found then
    return jsonb_build_object('status', 'no_encontrada');
  end if;

  if v_training.live_status <> 'en_vivo' then
    return jsonb_build_object(
      'status', 'sin_cambio',
      'live_status', v_training.live_status
    );
  end if;

  v_is_admin := public.current_user_role() in ('administrador', 'owner');

  if not v_is_admin then
    -- Solo lo reporta quien de verdad está viendo la transmisión…
    if not exists (
      select 1 from public.live_attendance la
      where la.training_id = p_training_id
        and la.user_id = auth.uid()
        and la.last_seen_at > now() - interval '5 minutes'
    ) then
      return jsonb_build_object('status', 'no_autorizado');
    end if;
    -- …y solo cuando ya llevaba rato al aire, para que un aviso suelto del
    -- reproductor no publique la grabación de un directo que apenas arrancó.
    if v_training.live_started_at is null
       or now() - v_training.live_started_at < interval '2 minutes' then
      return jsonb_build_object('status', 'muy_pronto');
    end if;
  end if;

  v_duration := greatest(
    extract(epoch from (now() - coalesce(v_training.live_started_at, now()))),
    0
  );
  v_video := v_training.live_video_id;

  update public.trainings
  set live_status = 'finalizada',
      live_ended_at = now(),
      live_enabled = false,
      -- La grabación queda publicada sola. Un video cargado a mano no se pisa.
      youtube_video_id = coalesce(youtube_video_id, v_video),
      duration_seconds = coalesce(duration_seconds, nullif(v_duration, 0)),
      live_error = null
  where id = p_training_id;

  if v_duration > 0 then
    v_credited := public.credit_live_attendance(p_training_id, v_duration);
  end if;

  return jsonb_build_object(
    'status', 'finalizada',
    'video_id', v_video,
    'duration_seconds', round(v_duration),
    'credited', v_credited
  );
end;
$$;

revoke execute on function public.finish_live_broadcast(uuid) from public, anon;
grant execute on function public.finish_live_broadcast(uuid) to authenticated;
