<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    options: { value: string; label: string }[]
    placeholder?: string
    required?: boolean
    disabled?: boolean
  }>(),
  { placeholder: 'Selecciona…', required: false, disabled: false },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="glass-field">
    <span class="glass-field-label">{{ label }}</span>
    <select
      v-model="model"
      class="glass-field-select"
      :required="required"
      :disabled="disabled"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
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

.glass-field-select {
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

.glass-field-select:focus {
  outline: none;
  border-color: var(--clarvi-blue);
  box-shadow: 0 0 0 3px rgba(var(--clarvi-blue-rgb), 0.18);
}

.glass-field-select:disabled {
  opacity: 0.6;
}
</style>
