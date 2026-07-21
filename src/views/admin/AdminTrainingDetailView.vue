<script setup lang="ts">
// Ficha completa de una capacitación: QR de asistencia, video,
// lista de asistentes presenciales y avance de visualización por usuario.

import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import GlassBadge from '@/components/glass/GlassBadge.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassCard from '@/components/glass/GlassCard.vue'
import GlassModal from '@/components/glass/GlassModal.vue'
import QrCodeDisplay from '@/components/trainings/QrCodeDisplay.vue'
import {
  formatDate,
  formatDateTime,
  formatMinutes,
  formatPercent,
} from '@/composables/useFormat'
import {
  getTraining,
  listAttendance,
  listViewers,
  regenerateQrToken,
} from '@/services/trainings.service'
import type {
  AttendanceWithProfile,
  Training,
  ViewerProgress,
} from '@/types/domain'

const route = useRoute()

const training = ref<Training | null>(null)
const attendance = ref<AttendanceWithProfile[]>([])
// shallowRef: el tipo Json recursivo de watched_ranges desborda la
// inferencia profunda de UnwrapRef en un ref normal.
const viewers = shallowRef<ViewerProgress[]>([])
const loading = ref(true)
const error = ref('')

const showRegenerateModal = ref(false)
const regenerating = ref(false)

const completedCount = computed(
  () => viewers.value.filter((viewer) => viewer.completed_at !== null).length,
)

const averagePercent = computed(() => {
  if (viewers.value.length === 0) return 0
  const total = viewers.value.reduce(
    (sum, viewer) => sum + (viewer.watch_percent ?? 0),
    0,
  )
  return total / viewers.value.length
})

onMounted(async () => {
  const id = String(route.params.id)
  try {
    const [trainingRow, attendanceRows, viewerRows] = await Promise.all([
      getTraining(id),
      listAttendance(id),
      listViewers(id),
    ])
    training.value = trainingRow
    attendance.value = attendanceRows
    viewers.value = viewerRows
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar'
  } finally {
    loading.value = false
  }
})

async function confirmRegenerate(): Promise<void> {
  if (!training.value) return
  regenerating.value = true
  try {
    const newToken = await regenerateQrToken(training.value.id)
    training.value = { ...training.value, qr_token: newToken }
    showRegenerateModal.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo regenerar'
  } finally {
    regenerating.value = false
  }
}
</script>

<template>
  <div>
    <p v-if="loading" class="muted">Cargando…</p>
    <p v-else-if="error" class="form-error">{{ error }}</p>

    <template v-else-if="training">
      <header class="page-header">
        <div>
          <h1>{{ training.title }}</h1>
          <p class="muted">{{ formatDate(training.session_date) }}</p>
        </div>
        <RouterLink
          :to="{ name: 'admin-training-edit', params: { id: training.id } }"
        >
          <GlassButton variant="ghost">Editar</GlassButton>
        </RouterLink>
      </header>

      <div class="stats-row">
        <GlassCard class="stat">
          <strong>{{ attendance.length }}</strong>
          <span>Asistieron presencial</span>
        </GlassCard>
        <GlassCard class="stat">
          <strong>{{ viewers.length }}</strong>
          <span>Han visto el video</span>
        </GlassCard>
        <GlassCard class="stat">
          <strong>{{ completedCount }}</strong>
          <span>Completaron</span>
        </GlassCard>
        <GlassCard class="stat">
          <strong>{{ formatPercent(averagePercent) }}</strong>
          <span>Avance promedio</span>
        </GlassCard>
      </div>

      <div class="two-col">
        <GlassCard>
          <h3>Código QR de asistencia</h3>
          <p class="muted">
            Proyéctalo o imprímelo en la sesión presencial; cada persona lo
            escanea con su teléfono para registrar su asistencia.
          </p>
          <QrCodeDisplay
            :token="training.qr_token"
            :training-title="training.title"
          />
          <div class="regenerate-row">
            <GlassButton variant="danger" @click="showRegenerateModal = true">
              Regenerar código
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard>
          <h3>Video</h3>
          <template v-if="training.youtube_video_id">
            <div class="video-frame">
              <iframe
                :src="`https://www.youtube.com/embed/${training.youtube_video_id}`"
                title="Video de la capacitación"
                allowfullscreen
              />
            </div>
            <p class="muted video-id">ID: {{ training.youtube_video_id }}</p>
          </template>
          <div v-else class="empty-state">
            <strong>Sin video todavía</strong>
            <span>
              Cuando el video esté editado y subido a YouTube, agrégalo desde
              “Editar”. Los usuarios lo verán como pendiente en su dashboard.
            </span>
          </div>
        </GlassCard>
      </div>

      <GlassCard class="table-card">
        <h3>Asistencia presencial ({{ attendance.length }})</h3>
        <div v-if="attendance.length" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Área</th>
                <th>Sucursal</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in attendance" :key="row.id">
                <td>{{ row.profiles?.full_name ?? '—' }}</td>
                <td>{{ row.areas?.nombre ?? '—' }}</td>
                <td>{{ row.sucursales?.nombre ?? '—' }}</td>
                <td>{{ formatDateTime(row.scanned_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted">Nadie ha escaneado el QR todavía.</p>
      </GlassCard>

      <GlassCard class="table-card">
        <h3>Visualización del video ({{ viewers.length }})</h3>
        <div v-if="viewers.length" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Área</th>
                <th>Sucursal</th>
                <th>Avance</th>
                <th>Tiempo visto</th>
                <th>Completada</th>
                <th>Última actividad</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="viewer in viewers" :key="viewer.id">
                <td>{{ viewer.profiles?.full_name ?? '—' }}</td>
                <td>{{ viewer.profiles?.areas?.nombre ?? '—' }}</td>
                <td>{{ viewer.profiles?.sucursales?.nombre ?? '—' }}</td>
                <td>
                  <div class="percent-cell">
                    <div
                      class="progress-bar"
                      :class="{ 'is-complete': viewer.completed_at !== null }"
                    >
                      <span
                        :style="{
                          width: `${Math.min(100, viewer.watch_percent ?? 0)}%`,
                        }"
                      />
                    </div>
                    <span class="percent-label">
                      {{ formatPercent(viewer.watch_percent) }}
                    </span>
                  </div>
                </td>
                <td>{{ formatMinutes(viewer.watched_seconds) }}</td>
                <td>
                  <GlassBadge v-if="viewer.completed_at" tone="success">
                    {{ formatDateTime(viewer.completed_at) }}
                  </GlassBadge>
                  <span v-else class="muted">—</span>
                </td>
                <td>{{ formatDateTime(viewer.last_heartbeat_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted">
          Nadie ha reproducido el video todavía
          {{ training.youtube_video_id ? '' : '(aún no hay video publicado)' }}.
        </p>
      </GlassCard>

      <GlassModal
        :open="showRegenerateModal"
        title="Regenerar código QR"
        @close="showRegenerateModal = false"
      >
        <p>
          Se generará un código nuevo y
          <strong>el QR impreso anterior dejará de funcionar</strong>. La
          asistencia ya registrada no se pierde. ¿Continuar?
        </p>
        <template #footer>
          <GlassButton variant="ghost" @click="showRegenerateModal = false">
            Cancelar
          </GlassButton>
          <GlassButton
            variant="danger"
            :loading="regenerating"
            @click="confirmRegenerate"
          >
            Regenerar
          </GlassButton>
        </template>
      </GlassModal>
    </template>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.stat {
  text-align: center;
  padding: 0.9rem;
}

.stat strong {
  display: block;
  font-size: 1.5rem;
  color: var(--clarvi-navy);
}

.stat span {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.regenerate-row {
  margin-top: 0.9rem;
  display: flex;
  justify-content: center;
}

.video-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000;
}

.video-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.video-id {
  margin-top: 0.5rem;
  font-size: 0.78rem;
}

.table-card {
  margin-bottom: 1rem;
}

.percent-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.percent-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--clarvi-navy);
  min-width: 38px;
}
</style>
