// Cliente único de Supabase para toda la aplicación.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.',
  )
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Config explícita de persistencia. Con un storageKey propio y estable
    // evitamos que dos pestañas (o un recarga en caliente de Vite en dev)
    // terminen con instancias de sesión distintas y que una escritura salga
    // sin token (como anon) mientras el usuario cree seguir con sesión.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'clarvi-capacitaciones-auth',
  },
})

/**
 * Garantiza que la petición que sigue lleve el token del usuario.
 *
 * `getSession()` lee la sesión persistida y refresca el access token si hace
 * falta, dejando el token al día en el cliente antes de una escritura. Si de
 * verdad no hay sesión (expiró en otra pestaña, se cerró sesión, etc.) lanza un
 * error claro en lugar de dejar que la operación viaje como anónima: así la RLS
 * ya no responde con un opaco "violates row-level security" que parecía un
 * problema de permisos cuando en realidad la sesión se había perdido.
 */
export async function requireActiveSession(): Promise<void> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  if (!data.session) {
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.')
  }
}
