// Transmisiones en vivo: estado del directo, presencia de quien lo ve y
// cierre de la transmisión.
//
// El estado del directo lo averigua la Edge Function `youtube-live` leyendo la
// página pública de YouTube (sin API de Google); desde el navegador no se
// puede hacer esa lectura porque YouTube no permite leer su HTML desde otro
// sitio (CORS).

import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, requireActiveSession } from '@/services/supabase'
import { asLiveStatus } from '@/types/domain'
import type { LiveProbe, LiveState, LiveViewer } from '@/types/domain'

/** Mensaje de error de una Edge Function (el cuerpo trae `{ error }`). */
async function functionErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (body.error) return body.error
    } catch {
      /* respuesta sin JSON */
    }
  }
  return error instanceof Error ? error.message : fallback
}

function toLiveState(raw: Record<string, unknown>): LiveState {
  return {
    training_id: String(raw.training_id ?? ''),
    live_enabled: raw.live_enabled === true,
    live_status: asLiveStatus(raw.live_status as string | null),
    live_video_id: (raw.live_video_id as string | null) ?? null,
    live_title: (raw.live_title as string | null) ?? null,
    live_scheduled_at: (raw.live_scheduled_at as string | null) ?? null,
    live_started_at: (raw.live_started_at as string | null) ?? null,
    live_ended_at: (raw.live_ended_at as string | null) ?? null,
    live_checked_at: (raw.live_checked_at as string | null) ?? null,
    live_error: (raw.live_error as string | null) ?? null,
    youtube_video_id: (raw.youtube_video_id as string | null) ?? null,
  }
}

/**
 * Pregunta a YouTube en qué va la transmisión y guarda lo que encuentre.
 *
 * La puede llamar cualquiera con sesión: es lo que hace que la página del
 * directo se entere sola de que empezó o terminó. El servidor no consulta
 * YouTube más de una vez cada 15 segundos, sin importar cuánta gente esté
 * viendo. `force` (solo admins) se salta esa espera.
 */
export async function syncLiveState(
  trainingId: string,
  force = false,
): Promise<LiveState> {
  const { data, error } = await supabase.functions.invoke('youtube-live', {
    body: { training_id: trainingId, force },
  })
  if (error) {
    throw new Error(
      await functionErrorMessage(error, 'No se pudo consultar la transmisión'),
    )
  }
  return toLiveState((data as { state: Record<string, unknown> }).state)
}

/** Lee un link y reporta qué hay ahí, sin tocar la capacitación (solo admin). */
export async function probeLiveUrl(url: string): Promise<LiveProbe> {
  const { data, error } = await supabase.functions.invoke('youtube-live', {
    body: { probe_url: url },
  })
  if (error) {
    throw new Error(await functionErrorMessage(error, 'No se pudo leer el link'))
  }
  return data as LiveProbe
}

/**
 * Enciende la transmisión de una capacitación.
 *
 * Empezar de cero es a propósito: una capacitación tiene una transmisión a la
 * vez, así que activar otra no puede arrastrar el video ni las marcas de
 * tiempo de la anterior. La grabación ya publicada (`youtube_video_id`) no se
 * toca.
 */
export async function startLiveBroadcast(
  trainingId: string,
  sourceUrl: string,
): Promise<void> {
  await requireActiveSession()
  const { error } = await supabase
    .from('trainings')
    .update({
      live_enabled: true,
      live_source_url: sourceUrl.trim() || null,
      live_status: 'inactiva',
      live_video_id: null,
      live_title: null,
      live_scheduled_at: null,
      live_started_at: null,
      live_ended_at: null,
      live_checked_at: null,
      live_error: null,
    })
    .eq('id', trainingId)
  if (error) throw new Error(error.message)
}

/** Apaga la transmisión sin publicar nada (se activó por error, se pospuso…). */
export async function cancelLiveBroadcast(trainingId: string): Promise<void> {
  await requireActiveSession()
  const { error } = await supabase
    .from('trainings')
    .update({ live_enabled: false, live_status: 'inactiva', live_error: null })
    .eq('id', trainingId)
  if (error) throw new Error(error.message)
}

export interface FinishLiveResult {
  status:
    | 'finalizada'
    | 'sin_cambio'
    | 'no_autorizado'
    | 'muy_pronto'
    | 'no_encontrada'
    | 'no_autenticado'
  credited?: number
  video_id?: string | null
}

/**
 * Da por terminada la transmisión: publica la grabación y acredita el tiempo
 * de quienes la vieron en vivo.
 *
 * La llaman dos caminos: el botón del admin y el propio reproductor de quien
 * está viendo, cuando YouTube le avisa que el directo terminó. El servidor
 * decide si acepta el aviso (ver `finish_live_broadcast`).
 */
export async function finishLiveBroadcast(
  trainingId: string,
): Promise<FinishLiveResult> {
  const { data, error } = await supabase.rpc('finish_live_broadcast', {
    p_training_id: trainingId,
  })
  if (error) throw new Error(error.message)
  return data as unknown as FinishLiveResult
}

export interface HeartbeatResult {
  status: 'ok' | 'sin_transmision' | 'no_autorizado' | 'no_autenticado'
  viewers: number
}

/** "Sigo aquí": mantiene viva la fila de asistencia y devuelve cuánta gente hay. */
export async function liveHeartbeat(
  trainingId: string,
  leaving = false,
): Promise<HeartbeatResult> {
  const { data, error } = await supabase.rpc('live_heartbeat', {
    p_training_id: trainingId,
    p_leaving: leaving,
  })
  if (error) throw new Error(error.message)
  return data as unknown as HeartbeatResult
}

/** Cuánta gente está viendo el directo ahora (sin nombres: eso es del admin). */
export async function liveViewerCount(trainingId: string): Promise<number> {
  const { data, error } = await supabase.rpc('live_viewer_count', {
    p_training_id: trainingId,
  })
  if (error) throw new Error(error.message)
  return data ?? 0
}

/** Quién vio la transmisión, con su área y sucursal (admin/owner por RLS). */
export async function listLiveAttendance(
  trainingId: string,
): Promise<LiveViewer[]> {
  const { data, error } = await supabase
    .from('live_attendance')
    .select('*, profiles(*, areas(nombre), sucursales(nombre))')
    .eq('training_id', trainingId)
    .order('joined_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as unknown as LiveViewer[]
}

/**
 * Se considera conectado si su último latido es de hace menos de 45 s.
 *
 * `at` es el instante contra el que se compara: la interfaz le pasa el momento
 * del último refresco para que el cálculo sea reactivo (Date.now() por su
 * cuenta no lo sería).
 */
export function isWatchingNow(
  viewer: { is_watching: boolean; last_seen_at: string },
  at: number = Date.now(),
): boolean {
  if (!viewer.is_watching) return false
  return at - Date.parse(viewer.last_seen_at) < 45_000
}
