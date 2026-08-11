// Ajustes de la plataforma (tabla `app_settings`, llave/valor).
//
// Hoy solo vive aquí el canal de YouTube del que se leen las transmisiones: se
// configura una vez y sirve para todas las capacitaciones, en lugar de pegar
// el link en cada una.

import { supabase, requireActiveSession } from '@/services/supabase'

export const CHANNEL_URL_KEY = 'youtube_channel_url'

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.value ?? null
}

/** Escribe un ajuste (solo admin/owner; lo aplica la RLS). */
export async function setSetting(
  key: string,
  value: string | null,
  updatedBy: string | null,
): Promise<void> {
  await requireActiveSession()
  const { error } = await supabase.from('app_settings').upsert(
    {
      key,
      value: value?.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: 'key' },
  )
  if (error) throw new Error(error.message)
}

export function getChannelUrl(): Promise<string | null> {
  return getSetting(CHANNEL_URL_KEY)
}

export function setChannelUrl(
  url: string,
  updatedBy: string | null,
): Promise<void> {
  return setSetting(CHANNEL_URL_KEY, url, updatedBy)
}
