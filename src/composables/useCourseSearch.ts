// Término del buscador de la barra superior.
//
// El campo vive en el encabezado y la lista que filtra vive en otra vista, así
// que el término es un ref de módulo: las dos piezas leen el mismo valor sin
// que nadie tenga que pasarlo por props ni levantar el estado a un store
// entero para una sola cadena.

import { computed, ref } from 'vue'

const term = ref('')

/** Quita acentos y mayúsculas para que "logistica" encuentre "Logística". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function useCourseSearch() {
  const query = computed(() => normalize(term.value))

  /** ¿Este texto coincide con lo que se está buscando? */
  function matches(...fields: (string | null | undefined)[]): boolean {
    if (!query.value) return true
    return fields.some((field) => field && normalize(field).includes(query.value))
  }

  function clear(): void {
    term.value = ''
  }

  return { term, query, isSearching: computed(() => query.value !== ''), matches, clear }
}
