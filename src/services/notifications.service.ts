// Avisos dentro de la plataforma. Los escribe la base de datos; desde aquí
// solo se leen y se marcan como leídos (lo demás lo bloquea un trigger).

import { supabase } from '@/services/supabase'
import type { AppNotification } from '@/types/domain'

/** Las últimas notificaciones del usuario; la RLS acota a las suyas. */
export async function listNotifications(
  limit = 30,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  if (error) throw new Error(error.message)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw new Error(error.message)
}
