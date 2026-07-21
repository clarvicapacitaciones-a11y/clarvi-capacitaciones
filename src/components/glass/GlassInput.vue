<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    type?: string
    placeholder?: string
    autocomplete?: string
    required?: boolean
    disabled?: boolean
    hint?: string
  }>(),
  { type: 'text', placeholder: '', autocomplete: 'off', required: false, disabled: false, hint: '' },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="glass-field">
    <span class="glass-field-label">{{ label }}</span>
    <input
      v-model="model"
      class="glass-field-input"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
    />
    <span v-if="hint" class="glass-field-hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.glass-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.glass-field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--clarvi-navy);
}

.glass-field-input {
  font: inherit;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.18);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-strong);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.glass-field-input:focus {
  outline: none;
  border-color: var(--clarvi-blue);
  box-shadow: 0 0 0 3px rgba(var(--clarvi-blue-rgb), 0.18);
}

.glass-field-input:disabled {
  opacity: 0.6;
}

.glass-field-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
