<script setup lang="ts">
// Administración de catálogos de áreas y sucursales.
// No se eliminan filas (hay perfiles/historial que las referencian);
// en su lugar se desactivan para que dejen de aparecer en el registro.

import { computed, onMounted, ref } from 'vue'
import GlassBadge from '@/components/glass/GlassBadge.vue'
import GlassButton from '@/components/glass/GlassButton.vue'
import GlassCard from '@/components/glass/GlassCard.vue'
import { useCatalogsStore } from '@/stores/catalogs.store'
import type { Area, Sucursal } from '@/types/domain'

type CatalogKind = 'areas' | 'sucursales'

const catalogs = useCatalogsStore()
const tab = ref<CatalogKind>('areas')
const newName = ref('')
const error = ref('')
const adding = ref(false)

const editingId = ref<string | null>(null)
const editingName = ref('')

const rows = computed<(Area | Sucursal)[]>(() =>
  tab.value === 'areas' ? catalogs.areas : catalogs.sucursales,
)

onMounted(() => {
  void catalogs.fetchCatalogs(true)
})

function switchTab(kind: CatalogKind): void {
  tab.value = kind
  editingId.value = null
  error.value = ''
}

async function handleAdd(): Promise<void> {
  const name = newName.value.trim()
  if (!name) return
  adding.value = true
  error.value = ''
  try {
    if (tab.value === 'areas') {
      await catalogs.createArea(name)
    } else {
      await catalogs.createSucursal(name)
    }
    newName.value = ''
  } catch (err) {
    error.value = describeError(err, 'No se pudo agregar')
  } finally {
    adding.value = false
  }
}

/**
 * Traduce los errores más comunes a un texto claro y, para cualquier otro,
 * muestra el mensaje real de Supabase (en vez de ocultarlo) para no dejar al
 * administrador sin pistas de qué salió mal.
 */
function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/duplicate/i.test(message)) return 'Ya existe un registro con ese nombre'
  if (/row-level security|violates/i.test(message)) {
    return 'Tu cuenta no tiene permiso para esta acción. Vuelve a iniciar sesión; si continúa, pide a un owner que confirme tu rol.'
  }
  if (/jwt|token|expired/i.test(message)) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.'
  }
  if (/fetch|network|failed to/i.test(message)) {
    return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  }
  return `${fallback}: ${message}`
}

function startEdit(row: Area | Sucursal): void {
  editingId.value = row.id
  editingName.value = row.nombre
}

async function saveEdit(row: Area | Sucursal): Promise<void> {
  const name = editingName.value.trim()
  if (!name || name === row.nombre) {
    editingId.value = null
    return
  }
  error.value = ''
  try {
    if (tab.value === 'areas') {
      await catalogs.updateArea(row.id, { nombre: name })
    } else {
      await catalogs.updateSucursal(row.id, { nombre: name })
    }
    editingId.value = null
  } catch (err) {
    error.value = describeError(err, 'No se pudo renombrar')
  }
}

async function toggleActive(row: Area | Sucursal): Promise<void> {
  error.value = ''
  try {
    if (tab.value === 'areas') {
      await catalogs.updateArea(row.id, { activo: !row.activo })
    } else {
      await catalogs.updateSucursal(row.id, { activo: !row.activo })
    }
  } catch (err) {
    error.value = describeError(err, 'No se pudo actualizar')
  }
}
</script>

<template>
  <div class="catalogs-page">
    <header class="page-header">
      <div>
        <h1>Catálogos</h1>
        <p class="muted">Áreas y sucursales disponibles al registrarse</p>
      </div>
    </header>

    <div class="tabs">
      <button
        class="tab"
        :class="{ 'is-active': tab === 'areas' }"
        @click="switchTab('areas')"
      >
        Áreas
      </button>
      <button
        class="tab"
        :class="{ 'is-active': tab === 'sucursales' }"
        @click="switchTab('sucursales')"
      >
        Sucursales
      </button>
    </div>

    <GlassCard>
      <form class="add-form" @submit.prevent="handleAdd">
        <input
          v-model="newName"
          class="add-input"
          :placeholder="tab === 'areas' ? 'Nueva área…' : 'Nueva sucursal…'"
        />
        <GlassButton type="submit" :loading="adding">Agregar</GlassButton>
      </form>

      <p v-if="error" class="form-error">{{ error }}</p>

      <ul class="catalog-list">
        <li v-for="row in rows" :key="row.id" class="catalog-row">
          <template v-if="editingId === row.id">
            <input
              v-model="editingName"
              class="add-input"
              @keyup.enter="saveEdit(row)"
              @keyup.esc="editingId = null"
            />
            <GlassButton variant="ghost" @click="saveEdit(row)">
              Guardar
            </GlassButton>
          </template>
          <template v-else>
            <span class="catalog-name" :class="{ 'is-inactive': !row.activo }">
              {{ row.nombre }}
            </span>
            <GlassBadge :tone="row.activo ? 'success' : 'neutral'">
              {{ row.activo ? 'Activa' : 'Inactiva' }}
            </GlassBadge>
            <div class="catalog-actions">
              <GlassButton variant="ghost" @click="startEdit(row)">
                Renombrar
              </GlassButton>
              <GlassButton variant="ghost" @click="toggleActive(row)">
                {{ row.activo ? 'Desactivar' : 'Activar' }}
              </GlassButton>
            </div>
          </template>
        </li>
      </ul>
    </GlassCard>
  </div>
</template>

<style scoped>
.catalogs-page {
  max-width: 640px;
}

.tabs {
  display: inline-flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
  background: rgba(var(--clarvi-navy-rgb), 0.06);
  border-radius: var(--radius-md);
  padding: 0.3rem;
}

.tab {
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.45rem 1rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.tab.is-active {
  background: #fff;
  color: var(--clarvi-navy);
  box-shadow: 0 2px 8px rgba(var(--clarvi-navy-rgb), 0.12);
}

.add-form {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.add-input {
  flex: 1;
  font: inherit;
  padding: 0.55rem 0.8rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--clarvi-navy-rgb), 0.18);
  background: rgba(255, 255, 255, 0.72);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.add-input:focus {
  outline: none;
  border-color: var(--clarvi-blue);
  box-shadow: 0 0 0 3px rgba(var(--clarvi-blue-rgb), 0.18);
}

.catalog-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.catalog-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid rgba(var(--clarvi-navy-rgb), 0.07);
}

.catalog-row:last-child {
  border-bottom: none;
}

.catalog-name {
  flex: 1;
  font-weight: 600;
  color: var(--text-strong);
}

.catalog-name.is-inactive {
  color: var(--text-muted);
  text-decoration: line-through;
}

.catalog-actions {
  display: flex;
  gap: 0.35rem;
}
</style>
