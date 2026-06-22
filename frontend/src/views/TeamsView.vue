<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const { t } = useI18n()

const teams = ref([])
const members = ref([])
const projects = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const selectedTeamId = ref(null)
const selectedMemberId = ref('')
const selectedProjectId = ref('')

const form = ref(emptyForm())

function emptyForm() {
  return {
    id_equipo: null,
    nombre: '',
    descripcion: '',
    id_lider: '',
  }
}

const selectedTeam = computed(() =>
  teams.value.find((team) => team.id_equipo === selectedTeamId.value) ?? null
)

const availableMembers = computed(() => {
  const assigned = new Set(selectedTeam.value?.miembros?.map((member) => member.id_usuario) ?? [])
  return members.value.filter((member) => !assigned.has(member.id_usuario))
})

const availableProjects = computed(() =>
  projects.value.filter((project) => !project.id_equipo || project.id_equipo === selectedTeamId.value)
)

const isEditing = computed(() => Boolean(form.value.id_equipo))

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authStore.token}`,
    'X-Company-ID': authStore.idEmpresaActual,
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`)
  return payload
}

async function loadData() {
  if (!authStore.idEmpresaActual) return
  loading.value = true
  error.value = ''
  try {
    const [teamsRes, contextRes] = await Promise.all([
      apiFetch('/api/teams'),
      apiFetch('/api/teams/context'),
    ])
    teams.value = teamsRes.data ?? []
    members.value = contextRes.data?.members ?? []
    projects.value = contextRes.data?.projects ?? []

    if (!selectedTeamId.value && teams.value.length) {
      selectTeam(teams.value[0])
    } else if (selectedTeamId.value) {
      const stillExists = teams.value.find((team) => team.id_equipo === selectedTeamId.value)
      if (stillExists) selectTeam(stillExists)
      else resetForm()
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function selectTeam(team) {
  selectedTeamId.value = team.id_equipo
  selectedMemberId.value = ''
  selectedProjectId.value = ''
  form.value = {
    id_equipo: team.id_equipo,
    nombre: team.nombre,
    descripcion: team.descripcion || '',
    id_lider: team.id_lider,
  }
}

function resetForm() {
  selectedTeamId.value = null
  selectedMemberId.value = ''
  selectedProjectId.value = ''
  form.value = emptyForm()
}

async function saveTeam() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const body = {
      nombre: form.value.nombre,
      descripcion: form.value.descripcion,
      id_lider: Number(form.value.id_lider),
    }
    if (isEditing.value) {
      await apiFetch(`/api/teams/${form.value.id_equipo}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      notice.value = t('teams.notices.teamUpdated')
    } else {
      const res = await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      selectedTeamId.value = res.data.id_equipo
      notice.value = t('teams.notices.teamCreated')
    }
    await loadData()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function deleteTeam() {
  if (!selectedTeam.value) return
  if (!confirm(t('teams.editor.deleteConfirm', { name: selectedTeam.value.nombre }))) return
  saving.value = true
  error.value = ''
  try {
    await apiFetch(`/api/teams/${selectedTeam.value.id_equipo}`, { method: 'DELETE' })
    notice.value = t('teams.notices.teamDeleted')
    resetForm()
    await loadData()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function addMember() {
  if (!selectedTeam.value || !selectedMemberId.value) return
  await runTeamAction(
    `/api/teams/${selectedTeam.value.id_equipo}/members/${selectedMemberId.value}`,
    'POST',
    t('teams.notices.memberAdded')
  )
  selectedMemberId.value = ''
}

async function removeMember(member) {
  if (!selectedTeam.value) return
  await runTeamAction(
    `/api/teams/${selectedTeam.value.id_equipo}/members/${member.id_usuario}`,
    'DELETE',
    t('teams.notices.memberRemoved')
  )
}

async function assignProject() {
  if (!selectedTeam.value || !selectedProjectId.value) return
  await runTeamAction(
    `/api/teams/${selectedTeam.value.id_equipo}/projects/${selectedProjectId.value}`,
    'POST',
    t('teams.notices.projectAssigned')
  )
  selectedProjectId.value = ''
}

async function removeProject(project) {
  if (!selectedTeam.value) return
  await runTeamAction(
    `/api/teams/${selectedTeam.value.id_equipo}/projects/${project.id_proyecto}`,
    'DELETE',
    t('teams.notices.projectRemoved')
  )
}

async function runTeamAction(path, method, message) {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    await apiFetch(path, { method })
    notice.value = message
    await loadData()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

function userName(user) {
  return [user.nombre, user.apellido].filter(Boolean).join(' ') || user.email
}

onMounted(loadData)
watch(() => authStore.idEmpresaActual, () => {
  resetForm()
  loadData()
})
</script>

<template>
  <div class="teams-root">
    <AppNavbar />

    <main class="teams-shell">
      <header class="teams-header">
        <div>
          <p class="eyebrow">{{ $t('teams.header.eyebrow') }}</p>
          <h1>{{ $t('teams.header.title') }}</h1>
          <p>{{ $t('teams.header.subtitle') }}</p>
        </div>
        <button class="primary-action" @click="resetForm">{{ $t('teams.header.newTeam') }}</button>
      </header>

      <div v-if="error" class="state state-error">{{ error }}</div>
      <div v-if="notice" class="state state-ok">{{ notice }}</div>

      <div v-if="loading" class="state">{{ $t('teams.loading') }}</div>

      <div v-else class="teams-layout">
        <aside class="teams-list">
          <div
            v-for="team in teams"
            :key="team.id_equipo"
            class="team-list-item"
            :class="{ active: team.id_equipo === selectedTeamId }"
            @click="selectTeam(team)"
          >
            <div>
              <strong>{{ team.nombre }}</strong>
              <span>{{ $t('teams.list.members', { count: team.miembros.length }) }}</span>
            </div>
            <small>{{ $t('teams.list.projects', { count: team.proyectos.length }) }}</small>
          </div>

          <div v-if="!teams.length" class="empty-card">
            {{ $t('teams.empty') }}
          </div>
        </aside>

        <section class="team-editor">
          <form class="team-form" @submit.prevent="saveTeam">
            <div class="editor-head">
              <div>
                <p class="eyebrow">{{ isEditing ? $t('teams.editor.editTitle') : $t('teams.editor.createTitle') }}</p>
                <h2>{{ isEditing ? form.nombre : $t('teams.editor.newTeamName') }}</h2>
              </div>
              <button v-if="isEditing" type="button" class="danger-action" :disabled="saving" @click="deleteTeam">
                {{ $t('teams.editor.delete') }}
              </button>
            </div>

            <div class="form-grid">
              <label>
                <span>{{ $t('teams.form.name') }}</span>
                <input v-model="form.nombre" type="text" required minlength="3" :placeholder="$t('teams.form.namePlaceholder')" />
              </label>
              <label>
                <span>{{ $t('teams.form.leader') }}</span>
                <select v-model="form.id_lider" required>
                  <option value="">{{ $t('teams.form.selectLeader') }}</option>
                  <option v-for="member in members" :key="member.id_usuario" :value="member.id_usuario">
                    {{ userName(member) }}
                  </option>
                </select>
              </label>
            </div>

            <label>
              <span>{{ $t('teams.form.description') }}</span>
              <textarea v-model="form.descripcion" rows="3" :placeholder="$t('teams.form.descriptionPlaceholder')"></textarea>
            </label>

            <div class="form-actions">
              <button type="submit" class="primary-action" :disabled="saving">
                {{ saving ? $t('teams.actions.saving') : isEditing ? $t('teams.actions.saveChanges') : $t('teams.actions.createTeam') }}
              </button>
            </div>
          </form>

          <div v-if="selectedTeam" class="management-grid">
            <section class="panel-card">
              <div class="panel-head">
                <div>
                  <p class="eyebrow">{{ $t('teams.members.eyebrow') }}</p>
                  <h3>{{ $t('teams.members.assigned', { count: selectedTeam.miembros.length }) }}</h3>
                </div>
              </div>

              <div class="inline-form">
                <select v-model="selectedMemberId" :disabled="!availableMembers.length">
                  <option value="">{{ $t('teams.members.addMember') }}</option>
                  <option v-for="member in availableMembers" :key="member.id_usuario" :value="member.id_usuario">
                    {{ userName(member) }}
                  </option>
                </select>
                <button class="secondary-action" :disabled="!selectedMemberId || saving" @click="addMember">{{ $t('teams.members.addBtn') }}</button>
              </div>

              <div class="stack-list">
                <div v-for="member in selectedTeam.miembros" :key="member.id_usuario" class="stack-row">
                  <div>
                    <strong>{{ userName(member) }}</strong>
                    <span>{{ member.email }}</span>
                  </div>
                  <button
                    class="ghost-danger"
                    :disabled="member.id_usuario === selectedTeam.id_lider || saving"
                    @click="removeMember(member)"
                  >
                    {{ $t('teams.members.removeBtn') }}
                  </button>
                </div>
              </div>
            </section>

            <section class="panel-card">
              <div class="panel-head">
                <div>
                  <p class="eyebrow">{{ $t('teams.projectsPanel.eyebrow') }}</p>
                  <h3>{{ $t('teams.projectsPanel.linked', { count: selectedTeam.proyectos.length }) }}</h3>
                </div>
              </div>

              <div class="inline-form">
                <select v-model="selectedProjectId" :disabled="!availableProjects.length">
                  <option value="">{{ $t('teams.projectsPanel.assignProject') }}</option>
                  <option v-for="project in availableProjects" :key="project.id_proyecto" :value="project.id_proyecto">
                    {{ project.nombre }}
                  </option>
                </select>
                <button class="secondary-action" :disabled="!selectedProjectId || saving" @click="assignProject">{{ $t('teams.projectsPanel.assignBtn') }}</button>
              </div>

              <div class="stack-list">
                <div v-for="project in selectedTeam.proyectos" :key="project.id_proyecto" class="stack-row">
                  <div>
                    <strong>{{ project.nombre }}</strong>
                    <span>{{ project.estado }}</span>
                  </div>
                  <button class="ghost-danger" :disabled="saving" @click="removeProject(project)">{{ $t('teams.projectsPanel.removeBtn') }}</button>
                </div>
                <div v-if="!selectedTeam.proyectos.length" class="muted-row">{{ $t('teams.projectsPanel.noProjects') }}</div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.teams-root {
  min-height: 100vh;
  background: transparent;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
}

.teams-shell {
  max-width: 1360px;
  margin: 0 auto;
  padding: 96px 48px 48px;
}

.teams-header,
.editor-head,
.panel-head,
.stack-row,
.team-list-item,
.inline-form {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.teams-header {
  margin-bottom: 28px;
}

.eyebrow {
  color: #caa860;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

h1, h2, h3 {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  margin: 0;
}

h1 { font-size: clamp(32px, 5vw, 48px); }
h2 { font-size: 28px; }
h3 { font-size: 20px; }

.teams-header p:not(.eyebrow),
.team-list-item span,
.team-list-item small,
.stack-row span,
.muted-row {
  color: #777;
  font-size: 13px;
}

.teams-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
}

.teams-list,
.team-editor,
.panel-card {
  background: rgba(12, 12, 12, 0.94);
  border: 1px solid #1f1f1f;
}

.teams-list {
  padding: 14px;
  align-self: start;
}

.team-list-item {
  cursor: pointer;
  padding: 14px;
  border: 1px solid transparent;
  transition: border-color .15s, background .15s;
}

.team-list-item:hover,
.team-list-item.active {
  background: #111111;
  border-color: rgba(202,168,96,0.3);
}

.team-list-item div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.team-list-item strong,
.stack-row strong {
  color: #faf8f5;
  font-size: 14px;
}

.team-editor {
  padding: 24px;
}

.team-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 24px;
  border-bottom: 1px solid #1f1f1f;
}

.form-grid,
.management-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label span {
  color: #888;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

input,
select,
textarea {
  width: 100%;
  background: #0a0a0a;
  border: 1px solid #252525;
  box-sizing: border-box;
  color: #faf8f5;
  font: inherit;
  outline: none;
  padding: 11px 12px;
}

textarea { resize: vertical; }
input:focus,
select:focus,
textarea:focus {
  border-color: #caa860;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.primary-action,
.secondary-action,
.danger-action,
.ghost-danger {
  border: 1px solid transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 10px 16px;
  transition: opacity .15s, border-color .15s, color .15s;
  white-space: nowrap;
}

.primary-action,
.secondary-action {
  background: #caa860;
  color: #0a0a0a;
}

.secondary-action {
  padding-inline: 14px;
}

.danger-action,
.ghost-danger {
  background: #111111;
  border-color: rgba(251,113,133,0.4);
  color: #fb7185;
}

button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.management-grid {
  margin-top: 24px;
}

.panel-card {
  padding: 20px;
}

.inline-form {
  margin: 18px 0;
}

.stack-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stack-row {
  background: #111111;
  border: 1px solid #1d1d1d;
  padding: 12px;
}

.stack-row div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.state,
.empty-card,
.muted-row {
  background: #0c0c0c;
  border: 1px solid #1f1f1f;
  color: #888;
  margin-bottom: 16px;
  padding: 16px;
}

.state-error {
  border-color: rgba(251,113,133,0.45);
  color: #fecdd3;
}

.state-ok {
  border-color: rgba(52,211,153,0.35);
  color: #86efac;
}

@media (max-width: 1000px) {
  .teams-layout,
  .management-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .teams-shell { padding: 80px 16px 32px; }
  .teams-header,
  .editor-head,
  .inline-form {
    align-items: stretch;
    flex-direction: column;
  }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
