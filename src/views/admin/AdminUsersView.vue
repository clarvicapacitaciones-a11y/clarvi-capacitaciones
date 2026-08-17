<script setup lang="ts">
// Roster de usuarios: búsqueda, filtros, edición de datos, activación y
// (solo para el owner) asignación de roles.

import { computed, onMounted, ref } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import {
  listUsers,
  setUserActive,
  setUserRole,
  updateProfile,
} from '@/services/profiles.service'
import { useAuthStore } from '@/stores/auth.store'
import { useCatalogsStore } from '@/stores/catalogs.store'
import {
  APPROVAL_LABELS,
  ROLE_LABELS,
  type ProfileWithCatalogs,
  type UserRole,
} from '@/types/domain'

const auth = useAuthStore()
const catalogs = useCatalogsStore()

const users = ref<ProfileWithCatalogs[]>([])
const loading = ref(true)
const error = ref('')

const search = ref('')
const filterArea = ref('')
const filterSucursal = ref('')
const filterRole = ref('')

const editing = ref<ProfileWithCatalogs | null>(null)
const editName = ref('')
const editArea = ref('')
const editSucursal = ref('')
const editRole = ref<UserRole>('colaborador')
const editActive = ref(true)
const saving = ref(false)
const editError = ref('')

const areaOptions = computed(() =>
  catalogs.areas.map((area) => ({ value: area.id, label: area.nombre })),
)
const sucursalOptions = computed(() =>
  catalogs.sucursales.map((s) => ({ value: s.id, label: s.nombre })),
)
const roleOptions = [
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'lider', label: 'Líder' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'owner', label: 'Owner' },
]

const filtered = computed(() =>
  users.value.filter((user) => {
    const term = search.value.trim().toLowerCase()
    if (
      term &&
      !user.full_name.toLowerCase().includes(term) &&
      !(user.email ?? '').toLowerCase().includes(term) &&
      !(user.username ?? '').toLowerCase().includes(term)
    ) {
      return false
    }
    if (filterArea.value && user.area_id !== filterArea.value) return false
    if (filterSucursal.value && user.sucursal_id !== filterSucursal.value) {
      return false
    }
    if (filterRole.value && user.role !== filterRole.value) return false
    return true
  }),
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const [userRows] = await Promise.all([listUsers(), catalogs.fetchCatalogs()])
    users.value = userRows
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'No se pudieron cargar los usuarios'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function accountOf(user: ProfileWithCatalogs): string {
  return user.auth_method === 'email'
    ? (user.email ?? '')
    : `@${user.username ?? ''}`
}

/** Un admin no puede editar al owner; el owner sí puede editar a todos. */
function canEdit(user: ProfileWithCatalogs): boolean {
  if (auth.isOwner) return true
  return user.role !== 'owner'
}

function openEdit(user: ProfileWithCatalogs): void {
  editing.value = user
  editName.value = user.full_name
  editArea.value = user.area_id ?? ''
  editSucursal.value = user.sucursal_id ?? ''
  editRole.value = user.role
  editActive.value = user.is_active
  editError.value = ''
}

async function saveEdit(): Promise<void> {
  if (!editing.value) return
  saving.value = true
  editError.value = ''
  try {
    await updateProfile(editing.value.id, {
      full_name: editName.value.trim(),
      area_id: editArea.value || null,
      sucursal_id: editSucursal.value || null,
    })
    if (auth.isOwner && editRole.value !== editing.value.role) {
      await setUserRole(editing.value.id, editRole.value)
    }
    if (editActive.value !== editing.value.is_active) {
      await setUserActive(editing.value.id, editActive.value)
    }
    editing.value = null
    await load()
  } catch (err) {
    editError.value =
      err instanceof Error ? err.message : 'No se pudieron guardar los cambios'
  } finally {
    saving.value = false
  }
}

function roleTone(role: UserRole): 'info' | 'warning' | 'neutral' {
  if (role === 'owner') return 'warning'
  if (role === 'administrador' || role === 'lider') return 'info'
  return 'neutral'
}
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>Usuarios</h1>
        <p class="muted">{{ users.length }} cuentas registradas</p>
      </div>
    </header>

    <UiCard class="filters-card">
      <div class="filters">
        <UiInput
          v-model="search"
          label="Buscar"
          placeholder="Nombre, correo o usuario"
        />
        <UiSelect
          v-model="filterArea"
          label="Área"
          :options="[{ value: '', label: 'Todas' }, ...areaOptions]"
          placeholder="Todas"
        />
        <UiSelect
          v-model="filterSucursal"
          label="Sucursal"
          :options="[{ value: '', label: 'Todas' }, ...sucursalOptions]"
          placeholder="Todas"
        />
        <UiSelect
          v-model="filterRole"
          label="Rol"
          :options="[{ value: '', label: 'Todos' }, ...roleOptions]"
          placeholder="Todos"
        />
      </div>
    </UiCard>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Cargando…</p>

    <UiCard v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cuenta</th>
              <th>Área</th>
              <th>Sucursal</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filtered" :key="user.id">
              <td>{{ user.full_name }}</td>
              <td class="muted">{{ accountOf(user) }}</td>
              <td>{{ user.areas?.nombre ?? '—' }}</td>
              <td>{{ user.sucursales?.nombre ?? '—' }}</td>
              <td>
                <UiBadge :tone="roleTone(user.role)">
                  {{ ROLE_LABELS[user.role] }}
                </UiBadge>
              </td>
              <td>
                <!-- Un registro sin resolver pesa más que activa/desactivada:
                     mientras siga pendiente la cuenta no entra. -->
                <UiBadge
                  v-if="user.approval_status !== 'aprobado'"
                  :tone="user.approval_status === 'pendiente' ? 'warning' : 'danger'"
                >
                  {{ APPROVAL_LABELS[user.approval_status] }}
                </UiBadge>
                <UiBadge v-else :tone="user.is_active ? 'success' : 'danger'">
                  {{ user.is_active ? 'Activa' : 'Desactivada' }}
                </UiBadge>
              </td>
              <td class="row-actions">
                <UiButton
                  v-if="canEdit(user)"
                  variant="ghost"
                  @click="openEdit(user)"
                >
                  Editar
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="filtered.length === 0" class="muted no-results">
          Sin resultados con esos filtros.
        </p>
      </div>
    </UiCard>

    <UiModal
      :open="editing !== null"
      :title="`Editar a ${editing?.full_name ?? ''}`"
      @close="editing = null"
    >
      <div class="form-grid">
        <UiInput v-model="editName" label="Nombre completo" required />
        <div class="form-row">
          <UiSelect v-model="editArea" label="Área" :options="areaOptions" />
          <UiSelect
            v-model="editSucursal"
            label="Sucursal"
            :options="sucursalOptions"
          />
        </div>
        <UiSelect
          v-if="auth.isOwner && editing?.id !== auth.userId"
          v-model="editRole"
          label="Rol"
          :options="roleOptions"
        />
        <label class="toggle-row">
          <input v-model="editActive" type="checkbox" />
          <span>Cuenta activa</span>
        </label>
        <p v-if="editError" class="form-error">{{ editError }}</p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="editing = null">
          Cancelar
        </UiButton>
        <UiButton :loading="saving" @click="saveEdit">Guardar</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.filters-card {
  margin-bottom: 1rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
}

.row-actions {
  text-align: right;
}

.no-results {
  padding: 1rem 0 0.25rem;
  text-align: center;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-body);
  cursor: pointer;
}

.toggle-row input {
  width: 1.05rem;
  height: 1.05rem;
  accent-color: var(--accent-fill);
}
</style>
