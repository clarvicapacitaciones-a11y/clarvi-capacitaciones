// Tema de la plataforma: oscuro de fábrica, claro si la persona lo elige.
//
// El tema es una sola pieza de estado global (no uno por componente), así que
// vive en un ref de módulo: cualquier vista que llame a useTheme() lee y
// escribe el mismo valor y todas se enteran del cambio.
//
// La aplicación real es un atributo en el <html> (`data-theme`) que los tokens
// de CSS observan; ningún componente pregunta por el tema para pintarse.

import { computed, readonly, ref } from 'vue'

export type Theme = 'dark' | 'light'

/** Clave del navegador donde queda guardada la preferencia. */
const STORAGE_KEY = 'clarvi:theme'

/** Sin elección previa, la plataforma abre en oscuro. */
export const DEFAULT_THEME: Theme = 'dark'

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light'
}

/**
 * Lee la preferencia guardada.
 *
 * El navegador puede negar el acceso a localStorage (modo privado, cookies
 * bloqueadas). Si eso pasa no es un error de la app: se usa el tema de fábrica.
 */
function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sin almacenamiento la preferencia dura lo que dure la pestaña.
  }
}

const current = ref<Theme>(readStoredTheme() ?? DEFAULT_THEME)

/** Pinta el tema en el <html>; de ahí lo toman los tokens. */
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/**
 * Deja el DOM y el estado en el mismo tema. Se llama una vez al arrancar
 * (main.ts) porque el index.html ya escribió el atributo antes del primer
 * pintado para que no haya un parpadeo de blanco.
 */
export function initTheme(): void {
  applyTheme(current.value)
}

export function useTheme() {
  function setTheme(theme: Theme): void {
    current.value = theme
    applyTheme(theme)
    persistTheme(theme)
  }

  function toggleTheme(): void {
    setTheme(current.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(current),
    isDark: computed(() => current.value === 'dark'),
    setTheme,
    toggleTheme,
  }
}
