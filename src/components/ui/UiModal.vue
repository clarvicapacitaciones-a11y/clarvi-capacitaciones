<script setup lang="ts">
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
            ×
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
  background: rgba(var(--clarvi-navy-rgb), 0.55);
}

.modal-panel {
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--bg-surface);
  border: var(--rule-strong);
  border-radius: var(--radius-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1.25rem;
  border-bottom: var(--rule);
}

.modal-header h3 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--clarvi-navy);
}

.modal-close {
  border: none;
  background: none;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.1rem 0.4rem;
  transition: color var(--transition-fast);
}

.modal-close:hover {
  color: var(--clarvi-navy);
}

.modal-body {
  padding: 1.1rem 1.25rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.9rem 1.25rem;
  border-top: var(--rule);
}
</style>
