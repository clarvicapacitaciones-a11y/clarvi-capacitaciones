// Catálogos de áreas y sucursales (lectura cacheada + CRUD de admin).

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { requireActiveSession, supabase } from '@/services/supabase'
import type { Area, Sucursal } from '@/types/domain'

export const useCatalogsStore = defineStore('catalogs', () => {
  const areas = ref<Area[]>([])
  const sucursales = ref<Sucursal[]>([])
  const loaded = ref(false)

  /** RLS decide qué filas llegan: anónimos/usuarios ven solo activas,
   *  administradores ven todas. */
  async function fetchCatalogs(force = false): Promise<void> {
    if (loaded.value && !force) return
    const [areasRes, sucursalesRes] = await Promise.all([
      supabase.from('areas').select('*').order('nombre'),
      supabase.from('sucursales').select('*').order('nombre'),
    ])
    if (areasRes.error) throw new Error(areasRes.error.message)
    if (sucursalesRes.error) throw new Error(sucursalesRes.error.message)
    areas.value = areasRes.data
    sucursales.value = sucursalesRes.data
    loaded.value = true
  }

  async function createArea(nombre: string): Promise<void> {
    // Nos aseguramos de que la escritura lleve el token del usuario: sin esto,
    // una sesión perdida hacía que el INSERT viajara como anónimo y la RLS lo
    // rechazara con "violates row-level security", que se leía como falta de
    // permisos del owner cuando el problema real era la sesión.
    await requireActiveSession()
    // .select() fuerza la lectura de la fila creada: así un bloqueo de RLS
    // (o cualquier otro problema) se reporta como error en lugar de fallar
    // en silencio, y el mensaje real llega a la UI.
    const { error } = await supabase
      .from('areas')
      .insert({ nombre: nombre.trim() })
      .select()
      .single()
    if (error) throw new Error(error.message)
    await fetchCatalogs(true)
  }

  async function updateArea(
    id: string,
    patch: { nombre?: string; activo?: boolean },
  ): Promise<void> {
    await requireActiveSession()
    const { error } = await supabase.from('areas').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCatalogs(true)
  }

  async function createSucursal(nombre: string): Promise<void> {
    await requireActiveSession()
    const { error } = await supabase
      .from('sucursales')
      .insert({ nombre: nombre.trim() })
      .select()
      .single()
    if (error) throw new Error(error.message)
    await fetchCatalogs(true)
  }

  async function updateSucursal(
    id: string,
    patch: { nombre?: string; activo?: boolean },
  ): Promise<void> {
    await requireActiveSession()
    const { error } = await supabase.from('sucursales').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCatalogs(true)
  }

  function areaName(id: string | null): string {
    return areas.value.find((a) => a.id === id)?.nombre ?? '—'
  }

  function sucursalName(id: string | null): string {
    return sucursales.value.find((s) => s.id === id)?.nombre ?? '—'
  }

  return {
    areas,
    sucursales,
    loaded,
    fetchCatalogs,
    createArea,
    updateArea,
    createSucursal,
    updateSucursal,
    areaName,
    sucursalName,
  }
})
