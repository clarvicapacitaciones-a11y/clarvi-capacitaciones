// Gestión de perfiles: la propia cuenta y la administración del roster.

import { supabase } from '@/services/supabase'
import type { ProfileWithCatalogs, UserRole } from '@/types/domain'

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
