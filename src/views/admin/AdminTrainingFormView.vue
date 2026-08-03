<script setup lang="ts">
// Alta y edición de capacitaciones. El link de YouTube es opcional al crear
// (la sesión suele registrarse antes de tener el video editado) y acepta
// cualquier formato de URL de YouTube.

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExamBuilder from '@/components/exams/ExamBuilder.vue'
import AreaSelector from '@/components/trainings/AreaSelector.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassCard from '@/components/glass/GlassCard.vue'
import GlassInput from '@/components/glass/GlassInput.vue'
import { parseYoutubeId } from '@/composables/useYoutubePlayer'
import { getExamForEdit, saveExam } from '@/services/exams.service'
import {
  createTraining,
  getTraining,
  getTrainingAreas,
  setTrainingAreas,
  updateTraining,
} from '@/services/trainings.service'
import { useAuthStore } from '@/stores/auth.store'
import { emptyExamDraft, type ExamDraft } from '@/types/exams'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const editingId = computed(() =>
  route.name === 'admin-training-edit' ? String(route.params.id) : null,
)

const title = ref('')
const description = ref('')
const sessionDate = ref('')
const youtubeUrl = ref('')
const areaIds = ref<string[]>([])
const error = ref('')
const loading = ref(false)
const loadingExisting = ref(false)

const exam = ref<ExamDraft>(emptyExamDraft())
const examExisted = ref(false)

// Si al crear falla el guardado del examen (p. ej. una pregunta incompleta),
// la capacitación ya quedó creada. Se recuerda su id para que reintentar
// actualice esa misma capacitación en vez de crear otra.
const createdId = ref<string | null>(null)

// Solo se llama a save_exam si hay algo que guardar. Si la capacitación ya
// tenía examen sí se llama aunque quede vacío: puede ser que el admin haya
// borrado todas las preguntas.
const shouldSaveExam = computed(
  () =>
    examExisted.value ||
    exam.value.questions.length > 0 ||
    exam.value.is_published,
)

const parsedVideoId = computed(() => parseYoutubeId(youtubeUrl.value))
const videoUrlInvalid = computed(
  () => youtubeUrl.value.trim() !== '' && parsedVideoId.value === null,
)

onMounted(async () => {
  if (!editingId.value) return
  loadingExisting.value = true
  try {
    const [training, examDraft, areas] = await Promise.all([
      getTraining(editingId.value),
      getExamForEdit(editingId.value),
      getTrainingAreas(editingId.value),
    ])
    areaIds.value = areas
    if (training) {
      title.value = training.title
      description.value = training.description ?? ''
      sessionDate.value = training.session_date ?? ''
      youtubeUrl.value = training.youtube_video_id
        ? `https://youtu.be/${training.youtube_video_id}`
        : ''
    }
    if (examDraft) {
      exam.value = examDraft
      examExisted.value = true
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar'
  } finally {
    loadingExisting.value = false
  }
})

async function handleSubmit(): Promise<void> {
  error.value = ''
  if (videoUrlInvalid.value) {
    error.value = 'El link de YouTube no es válido'
    return
  }
  if (!auth.userId) return
  loading.value = true
  try {
    const input = {
      title: title.value.trim(),
      description: description.value.trim() || null,
      session_date: sessionDate.value || null,
      youtube_video_id: parsedVideoId.value,
    }
    let id = editingId.value ?? createdId.value
    if (id) {
      await updateTraining(id, input)
    } else {
      // El examen cuelga de la capacitación: primero se crea ella, que da el id.
      const created = await createTraining(input, auth.userId)
      id = created.id
      createdId.value = id
    }
    await setTrainingAreas(id, areaIds.value)
    if (shouldSaveExam.value) {
      await saveExam(id, exam.value)
    }
    await router.push({ name: 'admin-training-detail', params: { id } })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo guardar'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="form-page">
    <header class="page-header">
      <h1>{{ editingId ? 'Editar capacitación' : 'Nueva capacitación' }}</h1>
    </header>

    <GlassCard>
      <p v-if="loadingExisting" class="muted">Cargando…</p>
      <form v-else class="form-grid" @submit.prevent="handleSubmit">
        <GlassInput
          v-model="title"
          label="Título"
          placeholder="p. ej. NOM-005-STPS Manejo de sustancias químicas"
          required
        />

        <label class="field-block">
          <span class="field-label">Descripción / temario</span>
          <textarea
            v-model="description"
            class="field-textarea"
            rows="4"
            placeholder="Temas cubiertos, instructor, notas…"
          />
        </label>

        <AreaSelector v-model="areaIds" />

        <div class="form-row">
          <GlassInput
            v-model="sessionDate"
            label="Fecha de la sesión presencial"
            type="date"
          />
          <GlassInput
            v-model="youtubeUrl"
            label="Link del video de YouTube"
            placeholder="https://youtu.be/…"
            hint="Opcional: agrégalo cuando el video esté listo. Acepta cualquier formato de link."
          />
        </div>

        <p v-if="videoUrlInvalid" class="form-error">
          No se reconoce ese link de YouTube. Copia el link directo del video
          (youtu.be/… o youtube.com/watch?v=…).
        </p>

        <div v-if="parsedVideoId" class="preview">
          <span class="field-label">Vista previa</span>
          <div class="preview-frame">
            <iframe
              :src="`https://www.youtube.com/embed/${parsedVideoId}`"
              title="Vista previa del video"
              allowfullscreen
            />
          </div>
        </div>

        <hr class="section-divider" />

        <ExamBuilder v-model="exam" />

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-actions">
          <GlassButton
            variant="ghost"
            @click="router.push({ name: 'admin-trainings' })"
          >
            Cancelar
          </GlassButton>
          <GlassButton type="submit" :loading="loading">
            {{ editingId ? 'Guardar cambios' : 'Crear capacitación' }}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  </div>
</template>

<style scoped>
/* Más ancho que un formulario normal: el constructor del examen necesita
   espacio para las opciones y las parejas. */
.form-page {
  max-width: 860px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-divider {
  border: none;
  border-top: 1px solid rgba(var(--clarvi-navy-rgb), 0.12);
  margin: 0.5rem 0;
  width: 100%;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.preview-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000;
}

.preview-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
</style>
