// Tipos de dominio de la aplicación, derivados del esquema de Supabase.

import type { Database, Tables } from './database.types'

export type UserRole = Database['public']['Enums']['user_role']
export type AuthMethod = Database['public']['Enums']['auth_method_type']
export type ApprovalStatus = Database['public']['Enums']['approval_status_type']

export type Profile = Tables<'profiles'>
export type Area = Tables<'areas'>
export type Sucursal = Tables<'sucursales'>
export type Training = Tables<'trainings'>
export type LiveAttendance = Tables<'live_attendance'>
export type WatchProgress = Tables<'watch_progress'>
export type Attendance = Tables<'attendance'>
export type TrainingStatusRow = Tables<'user_training_status'>
export type AppNotification = Tables<'notifications'>
export type Certificate = Tables<'certificates'>

export type TrainingStatus = 'pending' | 'in_progress' | 'completed'

/** Rango [inicioSegundos, finSegundos] de video efectivamente reproducido. */
export type WatchedRange = [number, number]

export interface ProfileWithCatalogs extends Profile {
  areas: { nombre: string } | null
  sucursales: { nombre: string } | null
}

/** Solicitud de registro con el nombre de quien la resolvió, si ya se resolvió. */
export interface ApprovalRequest extends ProfileWithCatalogs {
  approver: { full_name: string } | null
}

/** Datos congelados al emitir el diploma (columna `snapshot`). */
export interface CertificateSnapshot {
  full_name: string
  training_title: string
  session_date: string | null
  area: string | null
  sucursal: string | null
}

export interface CertificateWithSnapshot extends Omit<Certificate, 'snapshot'> {
  snapshot: CertificateSnapshot
}

export interface TrainingWithCounts extends Training {
  attendance: { count: number }[]
  watch_progress: { count: number }[]
}

export interface AttendanceWithProfile extends Attendance {
  profiles: { full_name: string } | null
  areas: { nombre: string } | null
  sucursales: { nombre: string } | null
}

export interface ViewerProgress extends WatchProgress {
  profiles: ProfileWithCatalogs | null
}

// ── Transmisiones en vivo ──────────────────────────────────────────────────

/**
 * Estado de la transmisión de una capacitación.
 *
 * `inactiva` → nadie ha encendido la transmisión.
 * `programada` → hay un directo anunciado (o esperando a que empiece).
 * `en_vivo` → está al aire; la plataforma lo embebe y mide quién lo ve.
 * `finalizada` → terminó y la grabación quedó publicada sola.
 */
export type LiveStatus = 'inactiva' | 'programada' | 'en_vivo' | 'finalizada'

export const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
  inactiva: 'Sin transmisión',
  programada: 'Programada',
  en_vivo: 'En vivo',
  finalizada: 'Finalizada',
}

/** La columna es `text` en la base; esto la acota al tipo de la aplicación. */
export function asLiveStatus(value: string | null | undefined): LiveStatus {
  return value === 'programada' || value === 'en_vivo' || value === 'finalizada'
    ? value
    : 'inactiva'
}

/** Quién está (o estuvo) viendo la transmisión, con sus datos. */
export interface LiveViewer extends LiveAttendance {
  profiles: ProfileWithCatalogs | null
}

/** Estado que devuelve la Edge Function `youtube-live`. */
export interface LiveState {
  training_id: string
  live_enabled: boolean
  live_status: LiveStatus
  live_video_id: string | null
  live_title: string | null
  live_scheduled_at: string | null
  live_started_at: string | null
  live_ended_at: string | null
  live_checked_at: string | null
  live_error: string | null
  youtube_video_id: string | null
}

/** Lo que la función encontró en un link, sin guardar nada (botón "Probar"). */
export interface LiveProbe {
  url: string
  info: {
    videoId: string | null
    title: string | null
    status: LiveStatus
    scheduledAt: string | null
    startedAt: string | null
    endedAt: string | null
    durationSeconds: number | null
    botWall: boolean
    error: string | null
  }
}

export interface RegisterPayload {
  method: AuthMethod
  email?: string
  username?: string
  password: string
  full_name: string
  area_id: string
  sucursal_id: string
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  administrador: 'Administrador',
  lider: 'Líder',
  colaborador: 'Colaborador',
}

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

/** Roles con acceso a la sección de administración (el líder, solo a Solicitudes). */
export const ADMIN_ROLES: UserRole[] = ['administrador', 'owner']
export const APPROVER_ROLES: UserRole[] = ['lider', 'administrador', 'owner']
