// Tipos de dominio de la aplicación, derivados del esquema de Supabase.

import type { Database, Tables } from './database.types'

export type UserRole = Database['public']['Enums']['user_role']
export type AuthMethod = Database['public']['Enums']['auth_method_type']
export type ApprovalStatus = Database['public']['Enums']['approval_status_type']

export type Profile = Tables<'profiles'>
export type Area = Tables<'areas'>
export type Sucursal = Tables<'sucursales'>
export type Training = Tables<'trainings'>
export type WatchProgress = Tables<'watch_progress'>
export type Attendance = Tables<'attendance'>
export type TrainingStatusRow = Tables<'user_training_status'>

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

/** Etiquetas de las pestañas del dashboard (agrupan capacitaciones, en plural). */
export const STATUS_LABELS: Record<TrainingStatus, string> = {
  pending: 'Pendientes',
  in_progress: 'En curso',
  completed: 'Completadas',
}
