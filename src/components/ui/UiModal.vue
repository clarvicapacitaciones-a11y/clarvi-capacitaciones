<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'

defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-panel" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" aria-label="Cerrar" @click="emit('close')">
            <UiIcon name="close" :size="16" />
          </button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Velo de color plano, sin blur. */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: var(--scrim);
}

.modal-panel {
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--surface-1);
  /* En oscuro el panel y el velo son ambos oscuros: el borde es lo que
     recorta el diálogo del fondo. */
  border: var(--rule);
  border-radius: var(--radius-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1.35rem 0.75rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-strong);
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border: none;
  border-radius: var(--radius-full);
  background: none;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.modal-close:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.modal-body {
  padding: 0 1.35rem 0.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.85rem 1.35rem 1.35rem;
}
</style>
