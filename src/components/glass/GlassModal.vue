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
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(var(--clarvi-navy-rgb), 0.35);
  backdrop-filter: blur(4px);
}

.modal-panel {
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95),
    rgba(var(--clarvi-blue-rgb), 0.08)
  );
  border: var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow-hover);
  backdrop-filter: blur(var(--glass-blur));
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.5rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.modal-close {
  border: none;
  background: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.modal-close:hover {
  background: rgba(var(--clarvi-navy-rgb), 0.08);
  color: var(--text-strong);
}

.modal-body {
  padding: 0.5rem 1.25rem 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0 1.25rem 1.25rem;
}
</style>
