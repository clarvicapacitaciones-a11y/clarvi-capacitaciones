<script setup lang="ts">
import { computed } from 'vue'
import GlassBadge from '@/components/glass/GlassBadge.vue'
import { STATUS_LABELS, type TrainingStatus } from '@/types/domain'

const props = defineProps<{ status: TrainingStatus }>()

const tone = computed(() => {
  if (props.status === 'completed') return 'success'
  if (props.status === 'in_progress') return 'info'
  return 'neutral'
})
</script>

<template>
  <GlassBadge :tone="tone">{{ STATUS_LABELS[status] }}</GlassBadge>
</template>
