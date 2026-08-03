<script setup lang="ts">
import { computed } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import { STATUS_LABELS, type TrainingStatus } from '@/types/domain'

const props = defineProps<{ status: TrainingStatus }>()

const tone = computed(() => {
  if (props.status === 'completed') return 'success'
  if (props.status === 'in_progress') return 'info'
  return 'neutral'
})
</script>

<template>
  <UiBadge :tone="tone">{{ STATUS_LABELS[status] }}</UiBadge>
</template>
