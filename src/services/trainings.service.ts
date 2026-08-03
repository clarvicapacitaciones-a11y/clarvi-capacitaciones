// Acceso a datos de capacitaciones, asistencia y progreso de visualización.

import { supabase } from '@/services/supabase'
import type {
  Attendance,
  AttendanceWithProfile,
  Training,
  TrainingStatusRow,
  TrainingWithCounts,
  ViewerProgress,
  WatchProgress,
} from '@/types/domain'

// ── Vistas del usuario ─────────────────────────────────────────────────────

/** Estados de todas las capacitaciones con video para el dashboard personal. */
export async function listMyTrainingStatuses(
  userId: string,
): Promise<TrainingStatusRow[]> {
  const { data, error } = await supabase
    .from('user_training_status')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false, nullsFirst: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getTraining(id: string): Promise<Training | null> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getMyProgress(
  trainingId: string,
  userId: string,
): Promise<WatchProgress | null> {
  const { data, error } = await supabase
    .from('watch_progress')
    .select('*')
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getMyAttendance(
  trainingId: string,
  userId: string,
): Promise<Attendance | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// ── Check-in por QR ────────────────────────────────────────────────────────

export type CheckinStatus =
  | 'checked_in'
  | 'already_checked_in'
  | 'invalid_token'
  | 'not_authenticated'

export async function checkinViaQr(
  token: string,
): Promise<{ status: CheckinStatus; trainingTitle: string | null }> {
  const { data, error } = await supabase.rpc('checkin_via_qr', {
    p_token: token,
  })
  if (error) throw new Error(error.message)
  const row = data[0]
  if (!row) return { status: 'invalid_token', trainingTitle: null }
  return {
    status: row.status as CheckinStatus,
    trainingTitle: row.training_title,
  }
}

/** Título de la sesión para la pantalla pública de check-in (rol anon). */
export async function trainingTitleForToken(
  token: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('training_title_for_token', {
    p_token: token,
  })
  if (error) throw new Error(error.message)
  return data
}

// ── Administración ─────────────────────────────────────────────────────────

export async function listAllTrainings(): Promise<TrainingWithCounts[]> {
  const { data, error } = await supabase
    .from('trainings')
    .select('*, attendance(count), watch_progress(count), training_areas(area_id)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as TrainingWithCounts[]
}

// ── Clasificación por área ─────────────────────────────────────────────────
// Sin áreas = para todo el personal. Con áreas, solo la ve quien pertenece a
// alguna de ellas (lo aplica la vista user_training_status).

export async function getTrainingAreas(trainingId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('training_areas')
    .select('area_id')
    .eq('training_id', trainingId)
  if (error) throw new Error(error.message)
  return data.map((row) => row.area_id)
}

/** Reemplaza el conjunto completo de áreas en una sola transacción. */
export async function setTrainingAreas(
  trainingId: string,
  areaIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc('set_training_areas', {
    p_training_id: trainingId,
    p_area_ids: areaIds,
  })
  if (error) throw new Error(error.message)
}

/** Total de completadas por capacitación (agregado en el cliente). */
export async function completedCountsByTraining(): Promise<
  Record<string, number>
> {
  const { data, error } = await supabase
    .from('watch_progress')
    .select('training_id, completed_at')
    .not('completed_at', 'is', null)
  if (error) throw new Error(error.message)
  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.training_id] = (counts[row.training_id] ?? 0) + 1
  }
  return counts
}

export interface TrainingInput {
  title: string
  description: string | null
  session_date: string | null
  youtube_video_id: string | null
}

export async function createTraining(
  input: TrainingInput,
  createdBy: string,
): Promise<Training> {
  const { data, error } = await supabase
    .from('trainings')
    .insert({ ...input, created_by: createdBy })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateTraining(
  id: string,
  patch: Partial<TrainingInput>,
): Promise<void> {
  const { error } = await supabase.from('trainings').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTraining(id: string): Promise<void> {
  const { error } = await supabase.from('trainings').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Invalida el QR impreso anterior generando un token nuevo. */
export async function regenerateQrToken(id: string): Promise<string> {
  const newToken = crypto.randomUUID()
  const { error } = await supabase
    .from('trainings')
    .update({ qr_token: newToken })
    .eq('id', id)
  if (error) throw new Error(error.message)
  return newToken
}

export async function listAttendance(
  trainingId: string,
): Promise<AttendanceWithProfile[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, profiles(full_name), areas(nombre), sucursales(nombre)')
    .eq('training_id', trainingId)
    .order('scanned_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as AttendanceWithProfile[]
}

export async function listViewers(
  trainingId: string,
): Promise<ViewerProgress[]> {
  const { data, error } = await supabase
    .from('watch_progress')
    .select('*, profiles(*, areas(nombre), sucursales(nombre))')
    .eq('training_id', trainingId)
    .order('watched_seconds', { ascending: false })
  if (error) throw new Error(error.message)
  return data as unknown as ViewerProgress[]
}
