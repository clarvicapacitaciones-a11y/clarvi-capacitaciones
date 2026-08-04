<script setup lang="ts">
// Solicitudes de registro: la cola que revisa el líder (y también admin/owner).
//
// Solo llegan aquí las altas por nombre de usuario: las de correo corporativo
// se validan solas con el dominio @clarvi.com y entran aprobadas.

import { onMounted, ref } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { formatDateTime } from '@/composables/useFormat'
import { useApprovalsStore } from '@/stores/approvals.store'
import { useAuthStore } from '@/stores/auth.store'
import { APPROVAL_LABELS, type ApprovalRequest } from '@/types/domain'

const approvals = useApprovalsStore()
const auth = useAuthStore()

const error = ref('')
const busyId = ref<string | null>(null)

const rejecting = ref<ApprovalRequest | null>(null)
const rejectReason = ref('')

async function load(): Promise<void> {
  error.value = ''
  try {
    await approvals.fetchRequests()
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes'
  }
}

onMounted(load)

async function approve(request: ApprovalRequest): Promise<void> {
  error.value = ''
  busyId.value = request.id
  try {
    await approvals.resolve(request.id, true)
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudo aprobar la solicitud'
  } finally {
    busyId.value = null
  }
}

function openReject(request: ApprovalRequest): void {
  rejecting.value = request
  rejectReason.value = ''
  error.value = ''
}

async function confirmReject(): Promise<void> {
  if (!rejecting.value) return
  const request = rejecting.value
  busyId.value = request.id
  try {
    await approvals.resolve(request.id, false, rejectReason.value)
    rejecting.value = null
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudo rechazar la solicitud'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>Solicitudes de registro</h1>
        <p class="muted">
          Quien no tiene correo se registra con un nombre de usuario y espera
          aquí: apruébalo solo si de verdad trabaja en CLARVI.
        </p>
        <p v-if="auth.isLider" class="muted">
          Ves únicamente a quien se registró en tu área, sea de la sucursal que sea.
        </p>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>
    <!-- Al recargar tras resolver una solicitud se conserva la tabla en vez de
         parpadear a "Cargando…". -->
    <p
      v-if="approvals.loading && approvals.requests.length === 0"
      class="muted"
    >
      Cargando…
    </p>

    <div v-else-if="approvals.pendingCount === 0" class="empty-state">
      <strong>No hay solicitudes pendientes</strong>
      <span>Cuando alguien se registre sin correo, aparecerá aquí.</span>
    </div>

    <UiCard v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Área</th>
              <th>Sucursal</th>
              <th>Se registró</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="request in approvals.pending" :key="request.id">
              <td>{{ request.full_name }}</td>
              <td class="muted">@{{ request.username }}</td>
              <td>{{ request.areas?.nombre ?? '—' }}</td>
              <td>{{ request.sucursales?.nombre ?? '—' }}</td>
              <td class="muted">{{ formatDateTime(request.created_at) }}</td>
              <td class="row-actions">
                <UiButton
                  variant="ghost"
                  :disabled="busyId === request.id"
                  @click="openReject(request)"
                >
                  Rechazar
                </UiButton>
                <UiButton
                  :loading="busyId === request.id"
                  @click="approve(request)"
                >
                  Aprobar
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <template v-if="approvals.resolved.length > 0">
      <h2 class="section-title">Resueltas</h2>
      <UiCard>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Resultado</th>
                <th>Resolvió</th>
                <th>Fecha</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="request in approvals.resolved" :key="request.id">
                <td>{{ request.full_name }}</td>
                <td class="muted">@{{ request.username }}</td>
                <td>
                  <UiBadge
                    :tone="
                      request.approval_status === 'aprobado' ? 'success' : 'danger'
                    "
                  >
                    {{ APPROVAL_LABELS[request.approval_status] }}
                  </UiBadge>
                </td>
                <td>{{ request.approver?.full_name ?? '—' }}</td>
                <td class="muted">{{ formatDateTime(request.approved_at) }}</td>
                <td class="muted">{{ request.rejection_reason ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </template>

    <UiModal
      :open="rejecting !== null"
      :title="`Rechazar a ${rejecting?.full_name ?? ''}`"
      @close="rejecting = null"
    >
      <div class="form-grid">
        <p class="muted">
          La cuenta queda rechazada y no podrá entrar. Si fue un error, un
          administrador tendrá que darla de alta de nuevo.
        </p>
        <UiInput
          v-model="rejectReason"
          label="Motivo (opcional)"
          placeholder="No trabaja en CLARVI"
        />
        <p v-if="error" class="form-error">{{ error }}</p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="rejecting = null">Cancelar</UiButton>
        <UiButton
          variant="danger"
          :loading="busyId !== null"
          @click="confirmReject"
        >
          Rechazar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
/* Las dos acciones de cada fila viven juntas, alineadas a la derecha. */
.row-actions {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}
</style>
