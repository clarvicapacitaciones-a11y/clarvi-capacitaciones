<script setup lang="ts">
// Alta y edición de capacitaciones. El link de YouTube es opcional al crear
// (la sesión suele registrarse antes de tener el video editado) y acepta
// cualquier formato de URL de YouTube.

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExamBuilder from '@/components/exams/ExamBuilder.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { parseYoutubeId } from '@/composables/useYoutubePlayer'
import { youtubeThumbnail } from '@/composables/useTrainingCover'
import { getExamForEdit, saveExam } from '@/services/exams.service'
import {
  createTraining,
  getTraining,
  updateTraining,
  uploadCoverImage,
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
const liveSourceUrl = ref('')
const coverImageUrl = ref('')
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

// Portada de la tarjeta. Si se deja vacía y hay video, el dashboard usa la
// miniatura de YouTube por su cuenta; el botón sirve para fijarla explícita-
// mente (o para partir de ella y luego cambiarla).
const coverPreview = computed(
  () =>
    coverImageUrl.value.trim() ||
    (parsedVideoId.value ? youtubeThumbnail(parsedVideoId.value) : ''),
)

function useYoutubeThumbnail(): void {
  if (parsedVideoId.value) {
    coverImageUrl.value = youtubeThumbnail(parsedVideoId.value)
  }
}

const coverInput = ref<HTMLInputElement | null>(null)
const uploadingCover = ref(false)
const coverError = ref('')

async function handleCoverFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  coverError.value = ''
  uploadingCover.value = true
  try {
    coverImageUrl.value = await uploadCoverImage(file)
  } catch (err) {
    coverError.value =
      err instanceof Error ? err.message : 'No se pudo subir la imagen'
  } finally {
    uploadingCover.value = false
    if (coverInput.value) coverInput.value.value = ''
  }
}

onMounted(async () => {
  if (!editingId.value) return
  loadingExisting.value = true
  try {
    const [training, examDraft] = await Promise.all([
      getTraining(editingId.value),
      getExamForEdit(editingId.value),
    ])
    if (training) {
      title.value = training.title
      description.value = training.description ?? ''
      sessionDate.value = training.session_date ?? ''
      youtubeUrl.value = training.youtube_video_id
        ? `https://youtu.be/${training.youtube_video_id}`
        : ''
      liveSourceUrl.value = training.live_source_url ?? ''
      coverImageUrl.value = training.cover_image_url ?? ''
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
      cover_image_url: coverImageUrl.value.trim() || null,
      live_source_url: liveSourceUrl.value.trim() || null,
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
    <RouterLink :to="{ name: 'admin-trainings' }" class="back-link">
      ← Capacitaciones
    </RouterLink>

    <header class="page-header">
      <h1>{{ editingId ? 'Editar capacitación' : 'Nueva capacitación' }}</h1>
    </header>

    <UiCard>
      <p v-if="loadingExisting" class="muted">Cargando…</p>
      <form v-else class="form-grid" @submit.prevent="handleSubmit">
        <UiInput
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

        <div class="form-row">
          <UiInput
            v-model="sessionDate"
            label="Fecha de la sesión presencial"
            type="date"
          />
          <UiInput
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

        <UiInput
          v-model="liveSourceUrl"
          label="Transmisión en vivo: canal o link del directo"
          placeholder="https://www.youtube.com/@tucanal  ·  https://youtu.be/…"
          hint="Se guarda aquí y la transmisión se enciende desde la ficha de la capacitación. Al terminar, la grabación se publica sola en el campo de arriba."
        />

        <div v-if="parsedVideoId" class="preview">
          <span class="field-label">Vista previa del video</span>
          <div class="preview-frame">
            <iframe
              :src="`https://www.youtube.com/embed/${parsedVideoId}`"
              title="Vista previa del video"
              allowfullscreen
            />
          </div>
        </div>

        <div class="cover-field">
          <span class="field-label">Imagen de portada</span>
          <p class="muted cover-hint">
            Es la imagen que se ve en la tarjeta del dashboard. Puedes subir
            una o usar la miniatura del video; si la dejas vacía y hay video,
            se usa la miniatura automáticamente.
          </p>

          <div class="cover-actions">
            <UiButton
              variant="ghost"
              :loading="uploadingCover"
              @click="coverInput?.click()"
            >
              Subir imagen
            </UiButton>
            <UiButton
              variant="ghost"
              :disabled="!parsedVideoId"
              @click="useYoutubeThumbnail"
            >
              Usar miniatura de YouTube
            </UiButton>
            <UiButton
              v-if="coverImageUrl"
              variant="ghost"
              @click="coverImageUrl = ''"
            >
              Quitar
            </UiButton>
          </div>

          <input
            ref="coverInput"
            class="cover-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @change="handleCoverFile"
          />

          <p v-if="coverError" class="form-error">{{ coverError }}</p>

          <div v-if="coverPreview" class="cover-preview">
            <img :src="coverPreview" alt="Vista previa de la portada" />
          </div>
          <p v-else class="muted cover-empty">
            Sin portada: la tarjeta mostrará solo el logotipo.
          </p>

          <UiInput
            v-model="coverImageUrl"
            label="…o pega la dirección de una imagen"
            placeholder="https://…/imagen.jpg"
          />
        </div>

        <hr class="section-divider" />

        <ExamBuilder v-model="exam" />

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-actions">
          <UiButton
            variant="ghost"
            @click="router.push({ name: 'admin-trainings' })"
          >
            Cancelar
          </UiButton>
          <UiButton type="submit" :loading="loading">
            {{ editingId ? 'Guardar cambios' : 'Crear capacitación' }}
          </UiButton>
        </div>
      </form>
    </UiCard>
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
  border-top: var(--rule);
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

.cover-field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.cover-hint {
  margin: -0.35rem 0 0;
}

/* El input real se dispara desde el botón: así el control se ve como el
   resto del sistema y no como el file input del navegador. */
.cover-input {
  display: none;
}

.cover-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cover-preview {
  width: min(320px, 100%);
  aspect-ratio: 16 / 9;
  border: var(--rule);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--navy-050);
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-empty {
  margin: 0;
}
</style>
