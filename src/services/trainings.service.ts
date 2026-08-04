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
    .select('*, attendance(count), watch_progress(count)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as TrainingWithCounts[]
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
  cover_image_url: string | null
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

/** Bucket público de portadas; solo admins pueden escribir (RLS de storage). */
const COVERS_BUCKET = 'training-covers'
const MAX_COVER_BYTES = 5 * 1024 * 1024

/**
 * Sube la portada elegida por el admin y devuelve su URL pública.
 *
 * El nombre lleva un sufijo aleatorio para que reemplazar la imagen de una
 * capacitación no quede servida desde la caché del navegador con la anterior.
 */
export async function uploadCoverImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG, PNG o WebP).')
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new Error('La imagen no debe pesar más de 5 MB.')
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(COVERS_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path)
  return data.publicUrl
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
