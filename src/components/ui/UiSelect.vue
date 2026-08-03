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

<!-- Mismo campo plano que UiInput: el estilo vive en base.css. -->
<template>
  <label class="field">
    <span class="field-label">{{ label }}</span>
    <select
      v-model="model"
      class="field-select"
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
