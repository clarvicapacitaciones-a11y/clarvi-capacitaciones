// Gestión de perfiles: la propia cuenta, la administración del roster y la
// cola de solicitudes de registro.

import { requireActiveSession, supabase } from '@/services/supabase'
import type {
  ApprovalRequest,
  ProfileWithCatalogs,
  UserRole,
} from '@/types/domain'

export async function listUsers(): Promise<ProfileWithCatalogs[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, areas(nombre), sucursales(nombre)')
    .order('full_name')
  if (error) throw new Error(error.message)
  return data as ProfileWithCatalogs[]
}

export interface ProfilePatch {
  full_name?: string
  area_id?: string | null
  sucursal_id?: string | null
}

export async function updateProfile(
  id: string,
  patch: ProfilePatch,
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Solo el owner puede cambiar roles (lo re-valida un trigger en la BD). */
export async function setUserRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setUserActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Solicitudes de registro ────────────────────────────────────────────────

/**
 * Las solicitudes sin resolver, las rechazadas y las que resolvió quien
 * consulta. Es exactamente lo que la RLS le deja ver a un líder; para admin y
 * owner acota la consulta a lo mismo (el roster completo vive en Usuarios).
 */
export async function listApprovalRequests(
  viewerId: string,
): Promise<ApprovalRequest[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      '*, areas(nombre), sucursales(nombre), approver:profiles!profiles_approved_by_fkey(full_name)',
    )
    .or(`approval_status.neq.aprobado,approved_by.eq.${viewerId}`)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as unknown as ApprovalRequest[]
}

export async function countPendingApprovals(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pendiente')
  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Aprueba o rechaza una solicitud. Quién la resolvió y cuándo lo sella el
 * trigger `guard_profile_changes`, no el cliente.
 */
export async function resolveApproval(
  id: string,
  approved: boolean,
  reason = '',
): Promise<void> {
  await requireActiveSession()
  const { error } = await supabase
    .from('profiles')
    .update({
      approval_status: approved ? 'aprobado' : 'rechazado',
      rejection_reason: approved ? null : reason.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
}
