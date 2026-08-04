// Cola de solicitudes de registro (rol líder, admin y owner).
//
// Vive en un store, y no dentro de la vista, porque la sub-navegación de
// Administración muestra el contador de pendientes: al resolver una solicitud
// la pestaña se actualiza sola.

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  listApprovalRequests,
  resolveApproval,
} from '@/services/profiles.service'
import { useAuthStore } from '@/stores/auth.store'
import type { ApprovalRequest } from '@/types/domain'

export const useApprovalsStore = defineStore('approvals', () => {
  const requests = ref<ApprovalRequest[]>([])
  /** Arranca en true: nadie ha consultado todavía, no es que no haya nada. */
  const loading = ref(true)

  /** Sin resolver, de la más antigua a la más reciente (orden de la fila). */
  const pending = computed(() =>
    requests.value.filter((r) => r.approval_status === 'pendiente'),
  )
  const pendingCount = computed(() => pending.value.length)

  /** Resueltas (aprobadas o rechazadas), de la más reciente a la más antigua. */
  const resolved = computed(() =>
    requests.value
      .filter((r) => r.approval_status !== 'pendiente')
      .sort((a, b) => (b.approved_at ?? '').localeCompare(a.approved_at ?? '')),
  )

  // La sub-navegación y la pestaña piden la lista casi al mismo tiempo; con la
  // petición en curso compartida se hace una sola consulta.
  let inFlight: Promise<void> | null = null

  function fetchRequests(): Promise<void> {
    if (inFlight) return inFlight
    const auth = useAuthStore()
    if (!auth.canApprove || !auth.userId) {
      requests.value = []
      loading.value = false
      return Promise.resolve()
    }
    const viewerId = auth.userId
    loading.value = true
    inFlight = listApprovalRequests(viewerId)
      .then((rows) => {
        requests.value = rows
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })
    return inFlight
  }

  async function resolve(
    id: string,
    approved: boolean,
    reason = '',
  ): Promise<void> {
    await resolveApproval(id, approved, reason)
    await fetchRequests()
  }

  return {
    requests,
    loading,
    pending,
    pendingCount,
    resolved,
    fetchRequests,
    resolve,
  }
})
