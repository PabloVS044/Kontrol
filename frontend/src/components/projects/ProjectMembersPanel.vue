<template>
  <section class="project-members">
    <div class="pm-header">
      <div>
        <p class="pm-eyebrow">Project Members</p>
        <h2 class="pm-title">{{ panel?.project?.nombre || 'Members' }}</h2>
        <p class="pm-subtitle">
          Solo se muestran usuarios de la empresa asignados a este proyecto. Desde aquí puedes asignar accesos y compartir una invitación específica del proyecto.
        </p>
      </div>

      <div class="pm-summary">
        <span class="pm-chip">{{ members.length }} asignados</span>
        <span class="pm-chip">{{ availableCompanyMembers.length }} disponibles</span>
        <span class="pm-chip" :class="{ inactive: !invitation }">
          {{ invitation ? 'Invitación activa' : 'Sin invitación activa' }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="pm-state">Cargando miembros del proyecto...</div>
    <div v-else-if="errorMessage" class="pm-state pm-state--error">{{ errorMessage }}</div>

    <template v-else-if="panel">
      <div v-if="!canManageMembers" class="pm-readonly">
        <p class="pm-state-title">Vista de solo lectura</p>
        <p class="pm-state-copy">
          Puedes consultar quién está asignado al proyecto, pero no tienes permisos para gestionar miembros o invitaciones.
        </p>
      </div>

      <div class="pm-grid">
        <article class="pm-card pm-card--invite">
          <div class="pm-card-head">
            <div>
              <p class="pm-card-kicker">Project Invite</p>
              <h3>Invitación del proyecto</h3>
            </div>
            <span class="pm-chip" :class="{ inactive: !invitation }">
              {{ invitation ? 'Activa' : 'Inactiva' }}
            </span>
          </div>

          <p class="pm-copy">
            El enlace agrega al usuario como collaborator de la empresa si aún no pertenece a ella y luego lo asigna a este proyecto con los permisos elegidos.
          </p>

          <div v-if="invitation" class="pm-link-box">
            <span class="pm-link">{{ invitation.link }}</span>
          </div>

          <div class="pm-permission-block">
            <span class="pm-label">Permisos que entrega esta invitación</span>
            <div class="pm-permission-grid">
              <label
                v-for="permission in projectPermissionCatalog"
                :key="`invite-${permission.nombre_permiso}`"
                class="pm-permission"
                :class="{ disabled: !canManageMembers }"
              >
                <input
                  type="checkbox"
                  :checked="invitePermissionDrafts.includes(permission.nombre_permiso)"
                  :disabled="!canManageMembers"
                  @change="toggleInvitePermission(permission.nombre_permiso, $event.target.checked)"
                />
                <span class="pm-permission-name">{{ permission.nombre_permiso }}</span>
                <small class="pm-permission-description">{{ permission.descripcion }}</small>
              </label>
            </div>
          </div>

          <div v-if="canManageMembers" class="pm-actions">
            <button
              class="pm-btn pm-btn--primary"
              :disabled="generatingInvite"
              @click="generateInvite"
            >
              {{ generatingInvite ? 'Guardando...' : invitation ? 'Actualizar invitación' : 'Generar invitación' }}
            </button>

            <button
              v-if="invitation"
              class="pm-btn pm-btn--secondary"
              @click="copyInviteLink"
            >
              Copiar enlace
            </button>

            <button
              v-if="invitation"
              class="pm-btn pm-btn--danger"
              :disabled="deactivatingInvite"
              @click="deactivateInvite"
            >
              {{ deactivatingInvite ? 'Desactivando...' : 'Desactivar enlace' }}
            </button>
          </div>

          <p v-if="actionMessage" class="pm-feedback pm-feedback--ok">{{ actionMessage }}</p>
          <p v-if="actionError" class="pm-feedback pm-feedback--error">{{ actionError }}</p>
        </article>

        <article class="pm-card">
          <div class="pm-card-head">
            <div>
              <p class="pm-card-kicker">Assignment</p>
              <h3>Agregar miembro existente</h3>
            </div>
          </div>

          <p class="pm-copy">
            Puedes tomar cualquier usuario ya perteneciente a la empresa y asignarlo a este proyecto con permisos explícitos.
          </p>

          <div class="pm-inline-controls">
            <select
              v-model="selectedMemberId"
              class="pm-select"
              :disabled="!canManageMembers || !availableCompanyMembers.length || assigningMember"
            >
              <option value="">Selecciona un miembro de la empresa</option>
              <option
                v-for="member in availableCompanyMembers"
                :key="member.id_usuario"
                :value="member.id_usuario"
              >
                {{ [member.nombre, member.apellido].filter(Boolean).join(' ') || member.email }}
              </option>
            </select>

            <button
              class="pm-btn pm-btn--primary"
              :disabled="!canManageMembers || !selectedMemberId || assigningMember"
              @click="assignMember"
            >
              {{ assigningMember ? 'Asignando...' : 'Asignar al proyecto' }}
            </button>
          </div>

          <div class="pm-permission-block">
            <span class="pm-label">Permisos iniciales para este miembro</span>
            <div class="pm-permission-grid">
              <label
                v-for="permission in projectPermissionCatalog"
                :key="`assign-${permission.nombre_permiso}`"
                class="pm-permission"
                :class="{ disabled: !canManageMembers || !selectedMemberId }"
              >
                <input
                  type="checkbox"
                  :checked="assignPermissionDrafts.includes(permission.nombre_permiso)"
                  :disabled="!canManageMembers || !selectedMemberId"
                  @change="toggleAssignPermission(permission.nombre_permiso, $event.target.checked)"
                />
                <span class="pm-permission-name">{{ permission.nombre_permiso }}</span>
                <small class="pm-permission-description">{{ permission.descripcion }}</small>
              </label>
            </div>
          </div>

          <p v-if="!availableCompanyMembers.length" class="pm-copy pm-copy--muted">
            Todos los miembros elegibles de la empresa ya están asignados a este proyecto.
          </p>
        </article>
      </div>

      <article class="pm-card pm-card--members">
        <div class="pm-card-head">
          <div>
            <p class="pm-card-kicker">Assigned Members</p>
            <h3>Miembros del proyecto</h3>
          </div>
          <span class="pm-chip">{{ members.length }} total</span>
        </div>

        <div v-if="members.length" class="pm-member-list">
          <div v-for="member in members" :key="member.id_usuario" class="pm-member">
            <div class="pm-member-head">
              <div class="pm-member-main">
                <div class="pm-avatar">
                  {{ (member.nombre || member.email || 'U').charAt(0).toUpperCase() }}
                </div>

                <div>
                  <strong class="pm-member-name">
                    {{ [member.nombre, member.apellido].filter(Boolean).join(' ') || member.email }}
                  </strong>
                  <p class="pm-member-meta">
                    {{ member.email }}
                    <span v-if="member.rol_empresa">· {{ member.rol_empresa }}</span>
                    <span v-if="member.rol_proyecto">· {{ member.rol_proyecto }}</span>
                  </p>
                </div>
              </div>

              <button
                v-if="canManageMembers"
                class="pm-btn pm-btn--danger"
                :disabled="removingMemberId === member.id_usuario"
                @click="removeMember(member)"
              >
                {{ removingMemberId === member.id_usuario ? 'Quitando...' : 'Quitar' }}
              </button>
            </div>

            <div class="pm-permission-block">
              <span class="pm-label">Permisos del proyecto</span>
              <div class="pm-permission-grid">
                <label
                  v-for="permission in projectPermissionCatalog"
                  :key="`${member.id_usuario}-${permission.nombre_permiso}`"
                  class="pm-permission"
                  :class="{ disabled: !canManageMembers }"
                >
                  <input
                    type="checkbox"
                    :checked="getMemberDraftPermissions(member.id_usuario).includes(permission.nombre_permiso)"
                    :disabled="!canManageMembers"
                    @change="toggleMemberPermission(member.id_usuario, permission.nombre_permiso, $event.target.checked)"
                  />
                  <span class="pm-permission-name">{{ permission.nombre_permiso }}</span>
                  <small class="pm-permission-description">{{ permission.descripcion }}</small>
                </label>
              </div>
            </div>

            <div v-if="canManageMembers" class="pm-member-actions">
              <button
                class="pm-btn pm-btn--secondary"
                :disabled="savingMemberId === member.id_usuario"
                @click="saveMemberPermissions(member)"
              >
                {{ savingMemberId === member.id_usuario ? 'Guardando...' : 'Guardar permisos' }}
              </button>
            </div>
          </div>
        </div>

        <p v-else class="pm-copy pm-copy--muted">
          No hay miembros asignados a este proyecto todavía.
        </p>
      </article>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['updated'])

const authStore = useAuthStore()

const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionError = ref('')
const panel = ref(null)

const selectedMemberId = ref('')
const assignPermissionDrafts = ref([])
const invitePermissionDrafts = ref([])
const memberPermissionDrafts = ref({})

const generatingInvite = ref(false)
const deactivatingInvite = ref(false)
const assigningMemberId = ref(null)
const savingMemberId = ref(null)
const removingMemberId = ref(null)

const members = computed(() => panel.value?.members ?? [])
const availableCompanyMembers = computed(() => panel.value?.available_company_members ?? [])
const projectPermissionCatalog = computed(() => panel.value?.project_permission_catalog ?? [])
const invitation = computed(() => panel.value?.invitation ?? null)
const canManageMembers = computed(() => panel.value?.can_manage_members === true)
const assigningMember = computed(() => assigningMemberId.value !== null)

function authHeaders(extraHeaders = {}) {
  return {
    Authorization: `Bearer ${authStore.token}`,
    'X-Empresa-ID': authStore.idEmpresaActual,
    ...extraHeaders,
  }
}

function syncDrafts(data) {
  invitePermissionDrafts.value = data?.invitation?.permisos ? [...data.invitation.permisos] : []

  const nextMemberDrafts = {}
  for (const member of data?.members ?? []) {
    nextMemberDrafts[String(member.id_usuario)] = [...(member.permisos ?? [])]
  }

  memberPermissionDrafts.value = nextMemberDrafts
  assignPermissionDrafts.value = []
}

async function loadPanel() {
  if (!props.projectId || !authStore.token || !authStore.idEmpresaActual) return

  loading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(`/api/projects/${props.projectId}/members-panel`, {
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      panel.value = null
      errorMessage.value = payload.message || 'No se pudo cargar el panel de miembros del proyecto.'
      return
    }

    panel.value = payload.data
    syncDrafts(payload.data)
  } catch {
    panel.value = null
    errorMessage.value = 'No se pudo cargar el panel de miembros del proyecto.'
  } finally {
    loading.value = false
  }
}

function updateSetDraft(currentValues, permissionName, enabled) {
  const nextValues = new Set(currentValues)

  if (enabled) nextValues.add(permissionName)
  else nextValues.delete(permissionName)

  return Array.from(nextValues)
}

function toggleInvitePermission(permissionName, enabled) {
  invitePermissionDrafts.value = updateSetDraft(invitePermissionDrafts.value, permissionName, enabled)
}

function toggleAssignPermission(permissionName, enabled) {
  assignPermissionDrafts.value = updateSetDraft(assignPermissionDrafts.value, permissionName, enabled)
}

function getMemberDraftPermissions(memberId) {
  return memberPermissionDrafts.value[String(memberId)] ?? []
}

function toggleMemberPermission(memberId, permissionName, enabled) {
  const key = String(memberId)
  memberPermissionDrafts.value = {
    ...memberPermissionDrafts.value,
    [key]: updateSetDraft(getMemberDraftPermissions(memberId), permissionName, enabled),
  }
}

async function generateInvite() {
  actionMessage.value = ''
  actionError.value = ''
  generatingInvite.value = true

  try {
    const res = await fetch(`/api/projects/${props.projectId}/invitacion`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ permisos: invitePermissionDrafts.value }),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo guardar la invitación del proyecto.'
      return
    }

    if (panel.value) {
      panel.value.invitation = payload.data
    }
    invitePermissionDrafts.value = [...(payload.data?.permisos ?? [])]
    actionMessage.value = 'Invitación del proyecto lista para compartir.'
  } catch {
    actionError.value = 'No se pudo guardar la invitación del proyecto.'
  } finally {
    generatingInvite.value = false
  }
}

async function deactivateInvite() {
  actionMessage.value = ''
  actionError.value = ''
  deactivatingInvite.value = true

  try {
    const res = await fetch(`/api/projects/${props.projectId}/invitacion`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo desactivar la invitación del proyecto.'
      return
    }

    if (panel.value) {
      panel.value.invitation = null
    }
    invitePermissionDrafts.value = []
    actionMessage.value = payload.message || 'La invitación del proyecto fue desactivada.'
  } catch {
    actionError.value = 'No se pudo desactivar la invitación del proyecto.'
  } finally {
    deactivatingInvite.value = false
  }
}

async function copyInviteLink() {
  if (!invitation.value?.link) return

  actionMessage.value = ''
  actionError.value = ''

  try {
    await navigator.clipboard.writeText(invitation.value.link)
    actionMessage.value = 'Enlace copiado al portapapeles.'
  } catch {
    actionError.value = 'No se pudo copiar el enlace.'
  }
}

async function assignMember() {
  if (!selectedMemberId.value) return

  actionMessage.value = ''
  actionError.value = ''
  assigningMemberId.value = Number(selectedMemberId.value)

  try {
    const res = await fetch(`/api/projects/${props.projectId}/members/${selectedMemberId.value}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ permisos: assignPermissionDrafts.value }),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo asignar el miembro al proyecto.'
      return
    }

    actionMessage.value = payload.message || 'Miembro asignado al proyecto.'
    selectedMemberId.value = ''
    assignPermissionDrafts.value = []
    await loadPanel()
    emit('updated')
  } catch {
    actionError.value = 'No se pudo asignar el miembro al proyecto.'
  } finally {
    assigningMemberId.value = null
  }
}

async function saveMemberPermissions(member) {
  actionMessage.value = ''
  actionError.value = ''
  savingMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/projects/${props.projectId}/members/${member.id_usuario}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ permisos: getMemberDraftPermissions(member.id_usuario) }),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudieron guardar los permisos del miembro.'
      return
    }

    actionMessage.value = payload.message || 'Permisos del miembro actualizados.'
    await loadPanel()
    emit('updated')
  } catch {
    actionError.value = 'No se pudieron guardar los permisos del miembro.'
  } finally {
    savingMemberId.value = null
  }
}

async function removeMember(member) {
  actionMessage.value = ''
  actionError.value = ''
  removingMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/projects/${props.projectId}/members/${member.id_usuario}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo remover el miembro del proyecto.'
      return
    }

    actionMessage.value = payload.message || 'Miembro removido del proyecto.'
    await loadPanel()
    emit('updated')
  } catch {
    actionError.value = 'No se pudo remover el miembro del proyecto.'
  } finally {
    removingMemberId.value = null
  }
}

watch(
  () => [props.projectId, authStore.idEmpresaActual, authStore.token],
  loadPanel,
  { immediate: true }
)
</script>

<style scoped>
.project-members {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pm-header,
.pm-card,
.pm-readonly {
  background: rgba(12, 12, 12, 0.88);
  border: 1px solid #1f1f1f;
}

.pm-header,
.pm-readonly {
  padding: 28px;
}

.pm-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.pm-eyebrow,
.pm-card-kicker,
.pm-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9a962;
}

.pm-title,
.pm-card h3,
.pm-state-title {
  font-family: 'Playfair Display', serif;
  color: #faf8f5;
}

.pm-title {
  font-size: 2.2rem;
  margin: 10px 0 8px;
}

.pm-subtitle,
.pm-copy,
.pm-state-copy,
.pm-member-meta {
  color: #8f8f8f;
  line-height: 1.7;
  font-family: 'Manrope', sans-serif;
}

.pm-summary,
.pm-actions,
.pm-inline-controls,
.pm-member-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.pm-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pm-chip.inactive {
  color: #6a6a6a;
}

.pm-state,
.pm-feedback {
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  font-family: 'Manrope', sans-serif;
}

.pm-state--error,
.pm-feedback--error {
  border-color: rgba(251, 113, 133, 0.24);
  color: #fecdd3;
}

.pm-feedback--ok {
  border-color: rgba(52, 211, 153, 0.24);
  color: #bbf7d0;
}

.pm-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 20px;
}

.pm-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.pm-card--members {
  margin-top: 20px;
}

.pm-card-head,
.pm-member-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.pm-card h3 {
  font-size: 1.7rem;
  margin-top: 8px;
}

.pm-link-box {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(201, 169, 98, 0.28);
}

.pm-link {
  display: block;
  color: #f8e7ba;
  word-break: break-all;
  line-height: 1.7;
}

.pm-inline-controls {
  align-items: center;
}

.pm-select {
  min-width: 280px;
  padding: 12px 14px;
  background: #131313;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
}

.pm-permission-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pm-permission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pm-permission {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
}

.pm-permission.disabled {
  cursor: default;
  opacity: 0.7;
}

.pm-permission input {
  accent-color: #c9a962;
}

.pm-permission-name {
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
}

.pm-permission-description {
  color: #7e7e7e;
  line-height: 1.5;
  font-family: 'Manrope', sans-serif;
}

.pm-btn {
  appearance: none;
  border: none;
  padding: 13px 16px;
  cursor: pointer;
  transition: transform 0.16s ease, opacity 0.16s ease;
  font-family: 'Manrope', sans-serif;
}

.pm-btn:hover {
  transform: translateY(-1px);
}

.pm-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.pm-btn--primary {
  background: #c9a962;
  color: #0a0a0a;
  font-weight: 700;
}

.pm-btn--secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #faf8f5;
}

.pm-btn--danger {
  background: rgba(251, 113, 133, 0.12);
  border: 1px solid rgba(251, 113, 133, 0.22);
  color: #fecdd3;
}

.pm-member-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pm-member {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.025);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pm-member-main {
  display: flex;
  gap: 14px;
  align-items: center;
}

.pm-avatar {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.12);
  border: 1px solid rgba(201, 169, 98, 0.2);
  color: #c9a962;
  font-weight: 700;
}

.pm-member-name {
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
}

.pm-copy--muted {
  color: #727272;
}

@media (max-width: 980px) {
  .pm-header,
  .pm-card-head,
  .pm-member-head {
    flex-direction: column;
  }

  .pm-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .pm-header,
  .pm-card,
  .pm-readonly {
    padding: 20px 16px;
  }

  .pm-title {
    font-size: 1.8rem;
  }

  .pm-select {
    min-width: 0;
    width: 100%;
  }

  .pm-permission-grid {
    grid-template-columns: 1fr;
  }

  .pm-inline-controls,
  .pm-actions,
  .pm-member-actions,
  .pm-summary {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
