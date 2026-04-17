<script setup>
import { computed, ref, watch } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import Card from '../components/UI/Card/Card.vue'
import Button from '../components/UI/Button/Button.vue'
import Pill from '../components/UI/Pill/Pill.vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const stats = [
  { label: 'Total Spent', value: '$12,450.00', trend: '+2.5%', trendColor: '#34d399', back: 'rgba(15,15,15,0.85)' },
  { label: 'Active Projects', value: '24', trend: '+3 new', trendColor: '#c9a962', back: 'rgba(15,15,15,0.85)' },
  { label: 'Overrun Alerts', value: '2', trend: 'Critical', trendColor: '#fb7185', back: 'rgba(25,10,10,0.85)' },
]

const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionError = ref('')

const generatingInvite = ref(false)
const deactivatingInvite = ref(false)
const updatingMemberId = ref(null)
const removingMemberId = ref(null)
const assigningProjectMemberId = ref(null)
const savingProjectAccessKey = ref('')
const removingProjectAccessKey = ref('')

const panel = ref(null)
const selectedProjectDrafts = ref({})
const permissionDrafts = ref({})

const members = computed(() => panel.value?.members ?? [])
const availableRoles = computed(() => panel.value?.available_roles ?? [])
const invitation = computed(() => panel.value?.invitation ?? null)
const isOwner = computed(() => authStore.canManageUsers)
const empresa = computed(() => panel.value?.empresa ?? null)
const companyProjects = computed(() => panel.value?.projects ?? [])
const projectPermissionCatalog = computed(() => panel.value?.project_permission_catalog ?? [])

const currentUserName = computed(() => {
  const fullName = [authStore.user?.nombre, authStore.user?.apellido].filter(Boolean).join(' ').trim()
  return fullName || authStore.user?.email || 'Usuario'
})

const totalMembers = computed(() => members.value.length)
const collaboratorCount = computed(() => members.value.filter((member) => member.rol_empresa === 'collaborator').length)
const adminLikeCount = computed(() =>
  members.value.filter((member) => ['owner', 'admin', 'manager'].includes(member.rol_empresa)).length
)

function authHeaders() {
  return {
    Authorization: `Bearer ${authStore.token}`,
    'X-Empresa-ID': authStore.idEmpresaActual,
  }
}

async function loadPanel() {
  if (!authStore.idEmpresaActual || !authStore.token) return

  loading.value = true
  errorMessage.value = ''

  try {
    if (!authStore.user) {
      await authStore.fetchMe()
    }

    const accessEmpresaId = authStore.accessContext?.empresa?.id_empresa
    if (accessEmpresaId !== authStore.idEmpresaActual) {
      await authStore.loadAccessContext()
    }

    if (!authStore.canManageUsers) {
      panel.value = null
      return
    }

    const res = await fetch('/api/empresas/panel-usuarios', {
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      errorMessage.value = payload.message || 'No se pudo cargar el panel de colaboradores.'
      panel.value = null
      return
    }

    panel.value = payload.data
    syncProjectDrafts(payload.data.members ?? [])
  } catch {
    errorMessage.value = 'No se pudo cargar el panel de colaboradores.'
    panel.value = null
  } finally {
    loading.value = false
  }
}

async function generateInvite() {
  actionMessage.value = ''
  actionError.value = ''
  generatingInvite.value = true

  try {
    const res = await fetch('/api/empresas/invitacion', {
      method: 'POST',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo generar el enlace.'
      return
    }

    if (panel.value) {
      panel.value.invitation = payload.data
    }
    actionMessage.value = 'Enlace de invitación listo para compartir.'
  } catch {
    actionError.value = 'No se pudo generar el enlace.'
  } finally {
    generatingInvite.value = false
  }
}

async function deactivateInvite() {
  actionMessage.value = ''
  actionError.value = ''
  deactivatingInvite.value = true

  try {
    const res = await fetch('/api/empresas/invitacion', {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo desactivar el enlace.'
      return
    }

    if (panel.value) {
      panel.value.invitation = null
    }
    actionMessage.value = payload.message || 'El enlace fue desactivado.'
  } catch {
    actionError.value = 'No se pudo desactivar el enlace.'
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

async function updateMemberRole(member, newRole) {
  if (member.rol_empresa === newRole) return

  actionMessage.value = ''
  actionError.value = ''
  updatingMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/empresas/miembros/${member.id_usuario}/rol`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rol: newRole }),
    })

    const payload = await res.json()
    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo actualizar el rol.'
      return
    }

    if (panel.value) {
      panel.value.members = panel.value.members.map((currentMember) =>
        currentMember.id_usuario === member.id_usuario ? payload.data : currentMember
      )
    }
    actionMessage.value = 'Rol actualizado.'
  } catch {
    actionError.value = 'No se pudo actualizar el rol.'
  } finally {
    updatingMemberId.value = null
  }
}

async function removeMember(member) {
  actionMessage.value = ''
  actionError.value = ''
  removingMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/empresas/miembros/${member.id_usuario}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo remover al usuario.'
      return
    }

    if (panel.value) {
      panel.value.members = panel.value.members.filter(
        ({ id_usuario }) => id_usuario !== member.id_usuario
      )
    }
    actionMessage.value = payload.message || 'Usuario removido.'
  } catch {
    actionError.value = 'No se pudo remover al usuario.'
  } finally {
    removingMemberId.value = null
  }
}

function projectDraftKey(idUsuario, idProyecto) {
  return `${idUsuario}:${idProyecto}`
}

function syncProjectDrafts(currentMembers) {
  const nextDrafts = {}

  for (const member of currentMembers) {
    for (const assignment of member.project_assignments || []) {
      nextDrafts[projectDraftKey(member.id_usuario, assignment.id_proyecto)] = [...assignment.permisos]
    }
  }

  permissionDrafts.value = nextDrafts
}

function availableProjectsForMember(member) {
  const assignedProjectIds = new Set(
    (member.project_assignments || []).map(({ id_proyecto }) => id_proyecto)
  )

  return companyProjects.value.filter(({ id_proyecto }) => !assignedProjectIds.has(id_proyecto))
}

function getDraftPermissions(memberId, projectId) {
  return permissionDrafts.value[projectDraftKey(memberId, projectId)] ?? []
}

function toggleProjectPermission(memberId, projectId, permissionName, enabled) {
  const key = projectDraftKey(memberId, projectId)
  const currentPermissions = new Set(getDraftPermissions(memberId, projectId))

  if (enabled) {
    currentPermissions.add(permissionName)
  } else {
    currentPermissions.delete(permissionName)
  }

  permissionDrafts.value = {
    ...permissionDrafts.value,
    [key]: Array.from(currentPermissions),
  }
}

async function assignProjectToMember(member) {
  const idProyecto = selectedProjectDrafts.value[member.id_usuario]
  if (!idProyecto) return

  actionMessage.value = ''
  actionError.value = ''
  assigningProjectMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/empresas/miembros/${member.id_usuario}/proyectos/${idProyecto}`, {
      method: 'PUT',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permisos: [] }),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo asignar el proyecto.'
      return
    }

    selectedProjectDrafts.value = {
      ...selectedProjectDrafts.value,
      [member.id_usuario]: '',
    }
    actionMessage.value = 'Proyecto asignado. Ahora puedes configurar sus permisos.'
    await loadPanel()
  } catch {
    actionError.value = 'No se pudo asignar el proyecto.'
  } finally {
    assigningProjectMemberId.value = null
  }
}

async function saveProjectPermissions(member, assignment) {
  actionMessage.value = ''
  actionError.value = ''

  const key = projectDraftKey(member.id_usuario, assignment.id_proyecto)
  savingProjectAccessKey.value = key

  try {
    const res = await fetch(
      `/api/empresas/miembros/${member.id_usuario}/proyectos/${assignment.id_proyecto}`,
      {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permisos: getDraftPermissions(member.id_usuario, assignment.id_proyecto) }),
      }
    )
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudieron guardar los permisos del proyecto.'
      return
    }

    actionMessage.value = 'Permisos del proyecto actualizados.'
    await loadPanel()
  } catch {
    actionError.value = 'No se pudieron guardar los permisos del proyecto.'
  } finally {
    savingProjectAccessKey.value = ''
  }
}

async function removeProjectAccess(member, assignment) {
  actionMessage.value = ''
  actionError.value = ''

  const key = projectDraftKey(member.id_usuario, assignment.id_proyecto)
  removingProjectAccessKey.value = key

  try {
    const res = await fetch(
      `/api/empresas/miembros/${member.id_usuario}/proyectos/${assignment.id_proyecto}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    )
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || 'No se pudo remover el acceso al proyecto.'
      return
    }

    actionMessage.value = payload.message || 'Acceso al proyecto removido.'
    await loadPanel()
  } catch {
    actionError.value = 'No se pudo remover el acceso al proyecto.'
  } finally {
    removingProjectAccessKey.value = ''
  }
}

watch(() => authStore.idEmpresaActual, loadPanel, { immediate: true })
</script>

<template>
  <div class="dashboard-layout">
    <AppNavbar />

    <main class="content">
      <header class="header">
        <h1 class="title">Executive Overview</h1>
        <p class="subtitle">Welcome back, {{ currentUserName }}</p>
      </header>

      <section
        v-if="authStore.accessContext && !authStore.canManageUsers && !authStore.canViewProjects && !authStore.canViewInventory"
        class="access-waiting"
      >
        <p class="team-eyebrow">Pending Access</p>
        <h2 class="access-waiting-title">You are already inside the company</h2>
        <p class="team-subtitle">
          Your account is linked to {{ authStore.empresaActual?.nombre || 'this company' }}, but the owner still has to assign projects and permissions before you can open operational panels.
        </p>
      </section>

      <section class="kpi-grid">
        <Card
          v-for="stat in stats"
          :key="stat.label"
          :title="stat.value"
          :subtitle="stat.label"
          :back="stat.back"
          titleColor="#faf8f5"
          borderColor="#1f1f1f"
          shadowColor="rgba(0,0,0,0.5)"
        >
          <Pill
            :label="stat.trend"
            :btnColor="stat.trendColor + '18'"
            :circleColor="stat.trendColor"
            :textColor="stat.trendColor"
          />
        </Card>
      </section>

      <section class="ai-box">
        <div class="ai-content">
          <h3 class="ai-title">KONTROL AI ANALYSIS</h3>
          <p class="ai-message">"{{ currentUserName }}, the 'Math Series 2026' stock is critical. I recommend restocking 40 units based on next week's projections."</p>
        </div>
        <Button label="GENERATE ORDER" @click="() => {}" />
      </section>

      <div class="charts-container">
        <div class="chart-card main-chart">
          <h3>Financial Performance Trend</h3>
          <div class="chart-placeholder">
            <svg viewBox="0 0 500 150" class="line-chart">
              <path d="M0,130 L100,110 L200,120 L300,80 L400,60 L500,40"
                    fill="none" stroke="var(--Primary)" stroke-width="3" />
              <path d="M0,130 L100,110 L200,120 L300,80 L400,60 L500,40 V150 H0 Z"
                    fill="url(#grad)" opacity="0.2" />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:var(--Primary);stop-opacity:1" />
                  <stop offset="100%" style="stop-color:var(--Primary);stop-opacity:0" />
                </linearGradient>
              </defs>
            </svg>
            <div class="chart-labels">
              <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
            </div>
          </div>
        </div>

        <div class="chart-card mini-chart">
          <h3>Budget by Category</h3>
          <div class="bar-group">
            <label>Books</label>
            <div class="bar-bg"><div class="bar-fill" style="width: 85%"></div></div>
          </div>
          <div class="bar-group">
            <label>Logistics</label>
            <div class="bar-bg"><div class="bar-fill" style="width: 40%"></div></div>
          </div>
        </div>
      </div>

      <section v-if="isOwner" class="company-collaborators">
        <div class="team-header">
          <div>
            <p class="team-eyebrow">Company Access</p>
            <h2 class="team-title">Collaborators</h2>
            <p class="team-subtitle">
              Gestiona acceso por empresa, asignación de proyectos y permisos tipo capacidades para cada colaborador.
            </p>
          </div>
          <div class="team-summary">
            <span class="team-chip">{{ totalMembers }} miembros</span>
            <span class="team-chip">{{ collaboratorCount }} collaborators</span>
            <span class="team-chip">{{ adminLikeCount }} roles de gestión</span>
          </div>
        </div>

        <div v-if="loading" class="team-state">Cargando colaboradores...</div>
        <div v-else-if="errorMessage" class="team-state team-state--error">{{ errorMessage }}</div>

        <template v-else-if="panel">
          <div class="team-grid">
            <article class="team-card invite-panel">
              <div class="team-card-head">
                <div>
                  <p class="team-card-kicker">Shared Invite</p>
                  <h3>Enlace de invitación</h3>
                </div>
                <span class="team-chip" :class="{ inactive: !invitation }">
                  {{ invitation ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <p class="team-copy">
                El owner puede compartir un único enlace de acceso para sumar colaboradores y desactivarlo cuando cierre la incorporación.
              </p>

              <template v-if="isOwner">
                <div v-if="invitation" class="invite-link-box">
                  <span class="invite-link">{{ invitation.link }}</span>
                </div>

                <div class="team-actions">
                  <button
                    v-if="!invitation"
                    class="team-btn team-btn--primary"
                    :disabled="generatingInvite"
                    @click="generateInvite"
                  >
                    {{ generatingInvite ? 'Generando...' : 'Generar enlace' }}
                  </button>

                  <template v-else>
                    <button class="team-btn team-btn--primary" @click="copyInviteLink">
                      Copiar enlace
                    </button>
                    <button
                      class="team-btn team-btn--secondary"
                      :disabled="deactivatingInvite"
                      @click="deactivateInvite"
                    >
                      {{ deactivatingInvite ? 'Desactivando...' : 'Desactivar enlace' }}
                    </button>
                  </template>
                </div>
              </template>

              <p v-else class="team-copy muted">
                Solo el owner puede ver, generar o desactivar el enlace.
              </p>

              <p v-if="actionMessage" class="feedback feedback--ok">{{ actionMessage }}</p>
              <p v-if="actionError" class="feedback feedback--error">{{ actionError }}</p>
            </article>

            <article class="team-card members-panel">
              <div class="team-card-head">
                <div>
                  <p class="team-card-kicker">Members</p>
                  <h3>Usuarios de la empresa</h3>
                </div>
                <span class="team-chip">{{ members.length }} total</span>
              </div>

              <div class="members-list">
                <div v-for="member in members" :key="member.id_usuario" class="member-row">
                  <div class="member-main">
                    <div class="member-avatar">
                      {{ (member.nombre || member.email || 'U').charAt(0).toUpperCase() }}
                    </div>
                    <div class="member-info">
                      <strong class="member-name">
                        {{ [member.nombre, member.apellido].filter(Boolean).join(' ') || member.email }}
                      </strong>
                      <span class="member-email">{{ member.email }}</span>
                    </div>
                  </div>

                  <div class="member-meta">
                    <span class="role-chip" :class="member.rol_empresa">{{ member.rol_empresa }}</span>

                    <template v-if="isOwner && member.rol_empresa !== 'owner'">
                      <select
                        class="role-select"
                        :value="member.rol_empresa"
                        :disabled="updatingMemberId === member.id_usuario"
                        @change="updateMemberRole(member, $event.target.value)"
                      >
                        <option
                          v-for="role in availableRoles"
                          :key="role.nombre"
                          :value="role.nombre"
                        >
                          {{ role.nombre }}
                        </option>
                      </select>

                      <button
                        class="team-btn team-btn--danger"
                        :disabled="removingMemberId === member.id_usuario"
                        @click="removeMember(member)"
                      >
                        {{ removingMemberId === member.id_usuario ? 'Quitando...' : 'Quitar' }}
                      </button>
                    </template>
                  </div>

                  <div v-if="member.rol_empresa !== 'owner'" class="member-project-access">
                    <div class="member-project-access-head">
                      <div>
                        <span class="member-project-access-title">Project Access</span>
                        <p class="member-project-access-subtitle">
                          Asignado sin permisos = pertenece al proyecto, pero no ve inventario ni puede escribir.
                        </p>
                      </div>

                      <div class="member-project-assignment-controls">
                        <select
                          v-model="selectedProjectDrafts[member.id_usuario]"
                          class="role-select"
                          :disabled="assigningProjectMemberId === member.id_usuario || !availableProjectsForMember(member).length"
                        >
                          <option value="">Selecciona proyecto</option>
                          <option
                            v-for="project in availableProjectsForMember(member)"
                            :key="project.id_proyecto"
                            :value="project.id_proyecto"
                          >
                            {{ project.nombre }}
                          </option>
                        </select>

                        <button
                          class="team-btn team-btn--primary"
                          :disabled="assigningProjectMemberId === member.id_usuario || !selectedProjectDrafts[member.id_usuario]"
                          @click="assignProjectToMember(member)"
                        >
                          {{ assigningProjectMemberId === member.id_usuario ? 'Asignando...' : 'Asignar proyecto' }}
                        </button>
                      </div>
                    </div>

                    <div v-if="member.project_assignments.length" class="project-assignment-list">
                      <div
                        v-for="assignment in member.project_assignments"
                        :key="`${member.id_usuario}-${assignment.id_proyecto}`"
                        class="project-assignment-card"
                      >
                        <div class="project-assignment-head">
                          <div>
                            <strong class="member-name">{{ assignment.proyecto_nombre }}</strong>
                            <p class="member-email">{{ assignment.proyecto_estado }}</p>
                          </div>

                          <button
                            class="team-btn team-btn--danger"
                            :disabled="removingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}`"
                            @click="removeProjectAccess(member, assignment)"
                          >
                            {{ removingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}` ? 'Quitando...' : 'Quitar proyecto' }}
                          </button>
                        </div>

                        <div class="permission-grid">
                          <label
                            v-for="permission in projectPermissionCatalog"
                            :key="`${assignment.id_proyecto}-${permission.nombre_permiso}`"
                            class="permission-toggle"
                          >
                            <input
                              type="checkbox"
                              :checked="getDraftPermissions(member.id_usuario, assignment.id_proyecto).includes(permission.nombre_permiso)"
                              @change="toggleProjectPermission(member.id_usuario, assignment.id_proyecto, permission.nombre_permiso, $event.target.checked)"
                            />
                            <span class="permission-name">{{ permission.nombre_permiso }}</span>
                            <small class="permission-description">{{ permission.descripcion }}</small>
                          </label>
                        </div>

                        <div class="project-assignment-actions">
                          <button
                            class="team-btn team-btn--secondary"
                            :disabled="savingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}`"
                            @click="saveProjectPermissions(member, assignment)"
                          >
                            {{ savingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}` ? 'Guardando...' : 'Guardar permisos' }}
                          </button>
                        </div>
                      </div>
                    </div>

                    <p v-else class="team-copy muted">
                      Este usuario ya pertenece a la empresa, pero todavía no tiene proyectos accesibles.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;700&family=Manrope:wght@400;500;600;700&display=swap');

.dashboard-layout {
  display: flex;
  flex-direction: column;
  background: transparent;
  min-height: 100vh;
}

.content {
  flex: 1;
  padding: 80px 100px;
  color: var(--Text);
  background: rgba(10,10,10,0.82);
  margin-top: 56px;
}

.title {
  font-family: 'Playfair Display', serif;
  letter-spacing: -0.02em;
  font-size: 3rem;
  color: var(--Text);
  margin-bottom: 10px;
}

.subtitle {
  font-family: 'DM Sans', sans-serif;
  color: #666;
  margin-bottom: 40px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.access-waiting {
  background: rgba(12,10,5,0.9);
  border: 1px dashed var(--Primary);
  padding: 28px 32px;
  margin-bottom: 32px;
}

.access-waiting-title {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: #faf8f5;
  margin: 10px 0 8px;
}

.kpi-grid :deep(.card) {
  max-width: none;
  width: 100%;
  margin: 0;
  border-radius: 4px;
  padding: 24px;
  gap: 12px;
}

.kpi-grid :deep(.card-title) {
  font-size: 2rem;
  font-family: 'Playfair Display', serif;
}

.kpi-grid :deep(.card-subtitle) {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}

.ai-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(12,10,5,0.9);
  border: 1px dashed var(--Primary);
  padding: 40px;
  margin-bottom: 40px;
  gap: 32px;
}

.ai-title {
  color: var(--Primary);
  font-size: 12px;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
  font-family: 'DM Sans', sans-serif;
}

.ai-message {
  font-style: italic;
  font-size: 1.05rem;
  max-width: 800px;
  line-height: 1.6;
  font-family: 'DM Sans', sans-serif;
}

.ai-box :deep(.btn) {
  background: var(--Primary);
  color: #0a0a0a;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  border-radius: 0;
  padding: 12px 24px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ai-box :deep(.btn:hover) {
  filter: brightness(1.15);
}

.charts-container {
  display: flex;
  gap: 20px;
  margin-bottom: 48px;
}

.chart-card {
  background: rgba(12,12,12,0.85);
  border: 1px solid var(--Border);
  padding: 30px;
  flex: 1;
}

.chart-card h3 {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.chart-placeholder {
  margin-top: 20px;
}

.line-chart {
  width: 100%;
  height: 150px;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: #444;
  font-size: 10px;
  font-family: 'DM Sans', sans-serif;
}

.bar-group {
  margin-bottom: 20px;
}

.bar-group label {
  font-size: 12px;
  display: block;
  margin-bottom: 8px;
  color: #888;
  font-family: 'DM Sans', sans-serif;
}

.bar-bg {
  background: #111;
  height: 6px;
  border-radius: 3px;
}

.bar-fill {
  background: var(--Primary);
  height: 100%;
  border-radius: 3px;
}

.company-collaborators {
  background: rgba(12,12,12,0.88);
  border: 1px solid #1f1f1f;
  padding: 32px;
}

.team-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.team-eyebrow,
.team-card-kicker {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--Primary);
}

.team-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.4rem;
  color: #faf8f5;
  margin: 10px 0 8px;
}

.team-subtitle,
.team-copy,
.member-email,
.muted {
  font-family: 'Manrope', sans-serif;
  color: #8f8f8f;
  line-height: 1.7;
}

.team-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.team-chip,
.role-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.03);
  color: #faf8f5;
}

.team-chip.inactive {
  color: #6a6a6a;
}

.team-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 20px;
}

.team-card {
  background: rgba(8,8,8,0.7);
  border: 1px solid #1f1f1f;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.team-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.team-card h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.7rem;
  color: #faf8f5;
  margin-top: 8px;
}

.invite-link-box {
  padding: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px dashed rgba(201,169,98,0.28);
}

.invite-link {
  display: block;
  color: #f8e7ba;
  word-break: break-all;
  line-height: 1.7;
}

.team-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.team-btn,
.role-select {
  appearance: none;
  border: none;
  font: inherit;
}

.team-btn {
  padding: 13px 16px;
  cursor: pointer;
  transition: transform .16s ease, opacity .16s ease;
}

.team-btn--primary {
  background: var(--Primary);
  color: #0a0a0a;
  font-weight: 700;
}

.team-btn--secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  color: #faf8f5;
}

.team-btn--danger {
  background: rgba(251,113,133,0.12);
  border: 1px solid rgba(251,113,133,0.22);
  color: #fecdd3;
}

.team-btn:hover {
  transform: translateY(-1px);
}

.team-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.feedback {
  padding: 14px 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  font-family: 'Manrope', sans-serif;
}

.feedback--ok {
  border-color: rgba(52,211,153,0.24);
  color: #bbf7d0;
}

.feedback--error,
.team-state--error {
  border-color: rgba(251,113,133,0.24);
  color: #fecdd3;
}

.team-state {
  padding: 18px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  font-family: 'Manrope', sans-serif;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-row {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
}

.member-main,
.member-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.member-meta {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.member-project-access {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.member-project-access-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.member-project-access-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--Primary);
}

.member-project-access-subtitle {
  margin-top: 6px;
  color: #7e7e7e;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
}

.member-project-assignment-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.project-assignment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.project-assignment-card {
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-assignment-head,
.project-assignment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.permission-toggle {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  cursor: pointer;
}

.permission-toggle input {
  accent-color: #c9a962;
}

.permission-name {
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
}

.permission-description {
  color: #7e7e7e;
  font-family: 'Manrope', sans-serif;
  line-height: 1.5;
}

.member-avatar {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201,169,98,0.12);
  border: 1px solid rgba(201,169,98,0.2);
  color: #c9a962;
  font-weight: 700;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-family: 'Manrope', sans-serif;
  color: #faf8f5;
}

.role-chip.owner {
  color: #c9a962;
}

.role-chip.admin {
  color: #93c5fd;
}

.role-chip.manager {
  color: #fca5a5;
}

.role-chip.collaborator {
  color: #86efac;
}

.role-select {
  padding: 12px 14px;
  background: #131313;
  border: 1px solid rgba(255,255,255,0.12);
  color: #faf8f5;
}

@media (max-width: 1100px) {
  .content {
    padding: 60px;
  }
}

@media (max-width: 900px) {
  .content {
    padding: 40px 32px;
  }

  .title {
    font-size: 2.2rem;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-container,
  .team-grid {
    flex-direction: column;
    grid-template-columns: 1fr;
  }

  .ai-box {
    flex-direction: column;
    align-items: flex-start;
    padding: 28px;
    gap: 20px;
  }

  .ai-box :deep(.btn) {
    align-self: flex-start;
  }

  .team-header {
    flex-direction: column;
  }

  .team-summary {
    justify-content: flex-start;
  }
}

@media (max-width: 600px) {
  .content {
    padding: 24px 16px;
  }

  .title {
    font-size: 1.8rem;
  }

  .subtitle {
    margin-bottom: 24px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .kpi-grid :deep(.card-title) {
    font-size: 1.6rem;
  }

  .ai-box {
    padding: 20px;
  }

  .ai-message {
    font-size: 0.95rem;
  }

  .company-collaborators {
    padding: 20px 16px;
  }

  .team-title {
    font-size: 1.9rem;
  }

  .member-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .member-meta {
    width: 100%;
    justify-content: flex-start;
  }

  .member-project-access-head,
  .project-assignment-head,
  .project-assignment-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .permission-grid {
    grid-template-columns: 1fr;
  }
}
</style>
