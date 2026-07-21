<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const showHeader = computed(() => route.matched.length > 0 && !route.meta.bare)
</script>

<template>
  <AppHeader v-if="showHeader" />
  <RouterView />
</template>
