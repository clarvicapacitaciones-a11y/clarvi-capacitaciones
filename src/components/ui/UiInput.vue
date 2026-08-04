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

<!-- El estilo del campo vive en base.css (.field / .field-label /
     .field-input) para que los controles armados a mano se vean idénticos. -->
<template>
  <label class="field">
    <span class="field-label">{{ label }}</span>
    <input
      v-model="model"
      class="field-input"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
    />
    <span v-if="hint" class="field-hint">{{ hint }}</span>
  </label>
</template>
