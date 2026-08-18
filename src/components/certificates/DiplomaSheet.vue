<script setup lang="ts">
// El formato del diploma: una hoja horizontal pensada para imprimirse o
// guardarse como PDF desde el navegador (no hay librería de PDF; el diálogo de
// impresión hace el trabajo y respeta las fuentes de la marca).
//
// Todo lo que se imprime sale del `snapshot` del diploma, no de las tablas
// vivas: renombrar un área o corregir el título de la capacitación después no
// reescribe un documento ya entregado.

import { computed } from 'vue'
import UiBrand from '@/components/ui/UiBrand.vue'
import { formatDate, formatDateTime } from '@/composables/useFormat'
import type { CertificateWithSnapshot } from '@/types/domain'

const props = defineProps<{ certificate: CertificateWithSnapshot }>()

const snapshot = computed(() => props.certificate.snapshot)

const lugarYFecha = computed(() => {
  const parts = [snapshot.value.sucursal, snapshot.value.area].filter(Boolean)
  return parts.join(' · ')
})

const sesion = computed(() =>
  snapshot.value.session_date ? formatDate(snapshot.value.session_date) : null,
)
</script>

<template>
  <article class="diploma">
    <header class="diploma-head">
      <UiBrand size="md" tone="brand" />
      <p class="eyebrow">Constancia de capacitación</p>
    </header>

    <div class="diploma-body">
      <p class="diploma-lead">Se otorga la presente constancia a</p>
      <p class="diploma-name">{{ snapshot.full_name }}</p>
      <p class="diploma-lead">por haber cursado y acreditado</p>
      <p class="diploma-course">{{ snapshot.training_title }}</p>

      <dl class="diploma-facts">
        <div v-if="sesion">
          <dt>Sesión</dt>
          <dd>{{ sesion }}</dd>
        </div>
        <div v-if="lugarYFecha">
          <dt>Adscripción</dt>
          <dd>{{ lugarYFecha }}</dd>
        </div>
        <div>
          <dt>Acreditación</dt>
          <dd>
            {{ certificate.earned_via === 'examen' ? 'Examen' : 'Video completo' }}
            <template v-if="certificate.score_percent !== null">
              · {{ Math.round(certificate.score_percent) }}%
            </template>
          </dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{{ formatDateTime(certificate.earned_at) }}</dd>
        </div>
      </dl>
    </div>

    <footer class="diploma-foot">
      <span class="diploma-folio">Folio {{ certificate.folio }}</span>
      <span class="diploma-note">
        Documento emitido por la plataforma de capacitaciones de CLARVI.
      </span>
    </footer>
  </article>
</template>

<style scoped>
/* Hoja horizontal con la misma disciplina del resto: color plano, líneas de
   1px y jerarquía por tamaño y peso. */
.diploma {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  aspect-ratio: 1.414 / 1;
  display: flex;
  flex-direction: column;
  padding: clamp(1.5rem, 4vw, 3rem);
  background: var(--surface-1);
  border: var(--rule);
  /* La franja superior es el pantón de marca, no el acento del tema: el
     diploma se imprime siempre igual. */
  border-top: 4px solid var(--brand-navy);
  border-radius: var(--radius-lg);
}

.diploma-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.diploma-head .eyebrow {
  margin: 0;
}

.diploma-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.diploma-lead {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.diploma-name {
  margin: 0.4rem 0 1.1rem;
  color: var(--brand-navy);
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 600;
  line-height: 1.2;
}

.diploma-course {
  margin: 0.4rem 0 0;
  color: var(--text-strong);
  font-size: clamp(1.1rem, 2.6vw, 1.5rem);
  font-weight: 600;
  line-height: 1.3;
}

.diploma-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.9rem;
  margin: clamp(1.2rem, 4vh, 2.4rem) 0 0;
  padding-top: 1rem;
  border-top: var(--rule);
  text-align: left;
}

.diploma-facts dt {
  color: var(--text-muted);
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.diploma-facts dd {
  margin: 0.15rem 0 0;
  color: var(--text-body);
  font-size: 0.9rem;
}

.diploma-foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: var(--rule);
  font-size: 0.76rem;
  color: var(--text-muted);
}

.diploma-folio {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: var(--text-body);
}

/* Al imprimir, la hoja es la página: sin bordes redondeados ni márgenes. */
@media print {
  .diploma {
    max-width: none;
    aspect-ratio: auto;
    height: 100vh;
    border: none;
    border-radius: 0;
    padding: 1.5cm;
  }
}
</style>
