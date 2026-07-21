// Sesión, perfil y helpers de rol del usuario autenticado.

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import type { Profile, RegisterPayload } from '@/types/domain'

/** Dominio reservado (no enrutable) para cuentas creadas con usuario. */
export const SYNTHETIC_DOMAIN = 'users.internal.clarvi'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_DOMAIN}`
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'Credenciales incorrectas. Verifica tus datos.'
  }
  if (/rate limit/i.test(message)) {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
  }
  return message
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)

  let initPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => session.value !== null)
  const userId = computed(() => session.value?.user.id ?? null)
  const role = computed(() => profile.value?.role ?? null)
  const isAdmin = computed(
    () => role.value === 'administrador' || role.value === 'owner',
  )
  const isOwner = computed(() => role.value === 'owner')
  const accessToken = computed(() => session.value?.access_token ?? null)

  async function fetchProfile(): Promise<void> {
    if (!userId.value) {
      profile.value = null
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId.value)
      .maybeSingle()
    profile.value = data
  }

  /** Idempotente: carga la sesión persistida y suscribe cambios de auth. */
  function init(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      await fetchProfile()
      supabase.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
        // setTimeout evita el deadlock documentado al llamar a supabase
        // dentro del callback de onAuthStateChange.
        setTimeout(() => {
          void fetchProfile()
        }, 0)
      })
    })()
    return initPromise
  }

  async function loginWithEmail(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw new Error(friendlyAuthError(error.message))
    session.value = data.session
    await fetchProfile()
  }

  async function loginWithUsername(
    username: string,
    password: string,
  ): Promise<void> {
    await loginWithEmail(usernameToEmail(username), password)
  }

  /**
   * Alta de cuenta vía la Edge Function `register`, que crea el usuario ya
   * confirmado (con o sin correo real) y después inicia sesión.
   */
  async function register(payload: RegisterPayload): Promise<void> {
    const { error } = await supabase.functions.invoke('register', {
      body: payload,
    })
    if (error) {
      let message = 'No se pudo crear la cuenta. Intenta de nuevo.'
      if (error instanceof FunctionsHttpError) {
        try {
          const body = (await error.context.json()) as { error?: string }
          if (body.error) message = body.error
        } catch {
          /* respuesta sin JSON: se usa el mensaje genérico */
        }
      }
      throw new Error(message)
    }
    if (payload.method === 'username') {
      await loginWithUsername(payload.username ?? '', payload.password)
    } else {
      await loginWithEmail(payload.email ?? '', payload.password)
    }
  }

  async function changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(friendlyAuthError(error.message))
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    session.value = null
    profile.value = null
  }

  return {
    session,
    profile,
    isAuthenticated,
    userId,
    role,
    isAdmin,
    isOwner,
    accessToken,
    init,
    fetchProfile,
    loginWithEmail,
    loginWithUsername,
    register,
    changePassword,
    logout,
  }
})
