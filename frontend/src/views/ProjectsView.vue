<template>
  <div class="projects-root">
    <AppNavbar />

    <BaseModal v-model="showModal" :title="$t('projects.form.newTitle')">
      <form class="modal-form" @submit.prevent="submitProject">

        <div class="form-field">
          <label>{{ $t('projects.form.name') }} <span class="req">*</span></label>
          <input v-model="form.nombre" type="text" :placeholder="$t('projects.form.namePlaceholder')" required />
        </div>

        <div class="form-field">
          <label>{{ $t('projects.form.description') }}</label>
          <textarea v-model="form.descripcion" :placeholder="$t('projects.form.descriptionPlaceholder')" rows="2" />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>{{ $t('projects.form.startDate') }} <span class="req">*</span></label>
            <input v-model="form.fecha_inicio" type="date" required />
          </div>
          <div class="form-field">
            <label>{{ $t('projects.form.endDate') }}</label>
            <input v-model="form.fecha_fin_planificada" type="date" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>{{ $t('projects.form.budget') }} <span class="req">*</span></label>
            <input v-model.number="form.presupuesto_total" type="number" min="0" step="0.01" placeholder="0.00" required />
          </div>
          <div class="form-field">
            <label>{{ $t('projects.form.status') }}</label>
            <select v-model="form.estado">
              <option v-for="e in ESTADOS" :key="e.value" :value="e.value">{{ e.label }}</option>
            </select>
          </div>
        </div>

        <p v-if="modalError" class="modal-error">{{ modalError }}</p>

        <div class="modal-actions">
          <Button :label="$t('projects.form.cancel')" type="button" @click="showModal = false" />
          <Button
            :label="modalLoading ? $t('projects.form.saving') : $t('projects.form.save')"
            type="submit"
            :disabled="modalLoading"
          />
        </div>
      </form>
    </BaseModal>

    <div class="projects-layout">

      <!-- Auth error -->
      <div v-if="authError" class="state-screen">
        <p class="state-title">{{ $t('projects.list.authError.title') }}</p>
        <p class="state-msg">{{ $t('projects.list.authError.message') }}</p>
      </div>

      <!-- Fetch error -->
      <div v-else-if="fetchError" class="state-screen">
        <p class="state-title">{{ $t('projects.list.fetchError.title') }}</p>
        <p class="state-msg">{{ fetchError }}</p>
        <button class="btn-primary" style="margin-top:16px" @click="loadData">
          <span>{{ $t('projects.list.fetchError.retry') }}</span>
        </button>
      </div>

      <template v-else>
        <!-- Main panel -->
        <div class="main-panel">

          <!-- Header -->
          <div class="proj-header">
            <div class="proj-header-left">
              <h1 class="proj-title">{{ $t('projects.list.title') }}</h1>
              <p class="proj-subtitle">{{ $t('projects.list.subtitle') }}</p>
            </div>
            <div class="proj-header-actions">
              <button v-if="authStore.canCreateProjects" data-birdie="create-project" class="btn-primary" @click="openModal">
                <svg class="icon16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="var(--k-form-btn-text)" stroke-width="1.5" stroke-linecap="square"/>
                </svg>
                <span>{{ $t('projects.list.newProject') }}</span>
              </button>
              <button class="icon-btn" :title="$t('projects.list.settings')">
                <svg class="icon18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="2.5" stroke="var(--k-text-dim)" stroke-width="1.4"/>
                  <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.697 3.697l1.414 1.414M12.889 12.889l1.414 1.414M3.697 14.303l1.414-1.414M12.889 5.111l1.414-1.414" stroke="var(--k-text-dim)" stroke-width="1.4" stroke-linecap="square"/>
                </svg>
              </button>
              <button class="icon-btn" :title="$t('projects.list.history')">
                <svg class="icon18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="var(--k-text-dim)" stroke-width="1.4"/>
                  <path d="M9 5v4.5l3 1.5" stroke="var(--k-text-dim)" stroke-width="1.4" stroke-linecap="square"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }} ({{ tab.count }})
            </button>
          </div>

          <!-- Section label + controls -->
          <div class="section-header">
            <span class="section-title">
              {{ activeTab === 'all' ? $t('projects.list.section.all') :
                 activeTab === 'active' ? $t('projects.list.section.active') :
                 activeTab === 'risk' ? $t('projects.list.section.atRisk') :
                 activeTab === 'completed' ? $t('projects.list.section.completed') : $t('projects.list.section.default') }}
            </span>
            <div class="section-controls">
              <div class="search-wrap">
                <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M9 9l3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                </svg>
                <input
                  v-model="searchQuery"
                  class="search-input"
                  :placeholder="$t('projects.list.searchPlaceholder')"
                  @keydown.escape="searchQuery = ''"
                />
                <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
              </div>
              <div class="view-toggle">
                <button class="vt-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" :title="$t('projects.list.gridView')">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="8" y="1" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="1" y="8" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="8" y="8" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                  </svg>
                </button>
                <button class="vt-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" :title="$t('projects.list.listView')">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <p class="section-meta">
            <span v-if="loading">{{ $t('projects.list.loading') }}</span>
            <span v-else>{{ $t('projects.list.count', { count: filteredProjects.length }) }}</span>
          </p>

          <!-- Skeleton -->
          <div v-if="loading" class="project-grid">
            <div v-for="n in 6" :key="n" class="project-card skeleton">
              <div class="skeleton-accent"></div>
              <div class="skeleton-body">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line mid"></div>
              </div>
            </div>
          </div>

          <!-- List view -->
          <div v-else-if="viewMode === 'list'" class="project-list">
            <!-- Column headers -->
            <div class="list-header">
              <div class="lh-spacer"></div>
              <div class="lh-col">{{ $t('projects.list.listHeaders.project') }}</div>
              <div class="lh-col">{{ $t('projects.list.listHeaders.progress') }}</div>
              <div class="lh-col">{{ $t('projects.list.listHeaders.budget') }}</div>
              <div class="lh-col">{{ $t('projects.list.listHeaders.due') }}</div>
              <div class="lh-col lh-center">{{ $t('projects.list.listHeaders.actions') }}</div>
              <div class="lh-col lh-center">{{ $t('projects.list.listHeaders.role') }}</div>
            </div>

            <div
              v-for="project in filteredProjects"
              :key="project.id_proyecto"
              class="list-row"
              @click="router.push(`/projects/${project.id_proyecto}`)"
            >
              <div class="lr-accent" :style="{ backgroundColor: statusColor(project.estado) }"></div>

              <!-- Name + status + desc -->
              <div class="lr-info">
                <p class="lr-name">{{ project.nombre }}</p>
                <div class="lr-meta">
                  <span class="lr-dot" :style="{ backgroundColor: statusColor(project.estado) }"></span>
                  <span class="lr-status-text" :style="{ color: statusColor(project.estado) }">{{ statusLabel(project.estado) }}</span>
                  <span class="lr-meta-sep">·</span>
                  <span class="lr-desc">{{ project.descripcion || $t('projects.noDescription') }}</span>
                </div>
              </div>

              <!-- Progress -->
              <div class="lr-progress-col">
                <div class="lr-bar-wrap">
                  <div class="lr-bar-fill" :style="{ width: statusProgress(project.estado) + '%', backgroundColor: statusColor(project.estado) }"></div>
                </div>
                <span class="lr-pct">{{ statusProgress(project.estado) }}%</span>
              </div>

              <!-- Budget -->
              <div class="lr-budget-col">
                <span class="lr-budget-spent">${{ budgetSpent(project) }}</span>
                <span class="lr-budget-sep">/</span>
                <span>${{ budgetTotal(project) }}</span>
              </div>

              <!-- Due date -->
              <div class="lr-due-col">{{ project.fecha_fin_planificada ? formatDate(project.fecha_fin_planificada) : '—' }}</div>

              <!-- Quick actions -->
              <div class="lr-actions" @click.stop>
                <button class="lr-btn" :title="$t('projects.list.quickActions.tasks')" @click="router.push(`/projects/${project.id_proyecto}?tab=tasks`)">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 3.5h10M1.5 6.5h7M1.5 9.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                </button>
                <button class="lr-btn" :title="$t('projects.list.quickActions.team')" @click="router.push(`/projects/${project.id_proyecto}?tab=team`)">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <circle cx="4.5" cy="4" r="2" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M1 11.5c0-1.9 1.6-3.5 3.5-3.5S8 9.6 8 11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                    <path d="M9 5.5c1.1.3 2 1.3 2 2.5M11 11.5c0-1.4-.9-2.6-2.5-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                  </svg>
                </button>
                <button class="lr-btn" :title="$t('projects.list.quickActions.budget')" @click="openBudget(project)">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M6.5 4v.8M6.5 8.2V9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    <path d="M5 7.8c0 .7.7 1.2 1.5 1.2S8 8.5 8 7.8C8 6.4 5 6.7 5 5.4 5 4.7 5.7 4.2 6.5 4.2S8 4.7 8 5.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                  </svg>
                </button>
                <button class="lr-btn" :title="$t('projects.list.quickActions.reports')" @click="router.push({ name: 'reports', query: { project: project.id_proyecto } })">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <path d="M2 11V7M4.5 11V4.5M7 11V2M9.5 11V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                    <path d="M1 12h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                </button>
              </div>

              <!-- Role pill -->
              <div class="lr-pill-col" @click.stop>
                <!-- TODO SCRUM-16: el azul de rol no-admin (#60a5fa) no existe en la paleta v2 -->
                <Pill
                  :label="isAdmin(project) ? 'ADMIN' : 'MEMBER'"
                  :btnColor="isAdmin(project) ? 'rgba(var(--k-color-primary-rgb), 0.12)' : 'rgba(96,165,250,0.08)'"
                  :circleColor="isAdmin(project) ? 'var(--k-color-primary)' : '#60a5fa'"
                  :textColor="isAdmin(project) ? 'var(--k-color-primary)' : '#60a5fa'"
                />
              </div>
            </div>
            <div v-if="filteredProjects.length === 0" class="empty-state">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="10" width="28" height="22" rx="2" stroke="var(--k-color-border)" stroke-width="1.5"/>
                <path d="M6 15h28M13 10V8M27 10V8" stroke="var(--k-color-border)" stroke-width="1.5" stroke-linecap="square"/>
                <path d="M13 22h14M13 27h8" stroke="var(--k-color-border)" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              <p class="empty-title">{{ $t('projects.list.empty.title') }}</p>
              <p class="empty-sub">{{ searchQuery ? $t('projects.list.empty.search') : $t('projects.list.empty.noFilter') }}</p>
              <button v-if="authStore.canCreateProjects && !searchQuery" class="btn-primary empty-cta" @click="openModal">
                <span>{{ $t('projects.list.empty.cta') }}</span>
              </button>
            </div>
          </div>

          <!-- Grid view -->
          <div v-else class="project-grid">
            <div
              v-for="project in filteredProjects"
              :key="project.id_proyecto"
              class="project-card"
            >
              <!-- Accent bar -->
              <div class="card-accent" :style="{ backgroundColor: statusColor(project.estado) }"></div>

              <!-- Status + Role -->
              <div class="card-status-row">
                <div class="card-status-left">
                  <span class="card-status-dot" :style="{ backgroundColor: statusColor(project.estado) }"></span>
                  <span class="card-status-text" :style="{ color: statusColor(project.estado) }">{{ statusLabel(project.estado) }}</span>
                </div>
                <!-- TODO SCRUM-16: el azul de rol no-admin (#60a5fa) no existe en la paleta v2 -->
                <Pill
                  :label="isAdmin(project) ? 'ADMIN' : 'MEMBER'"
                  :btnColor="isAdmin(project) ? 'rgba(var(--k-color-primary-rgb), 0.12)' : 'rgba(96,165,250,0.08)'"
                  :circleColor="isAdmin(project) ? 'var(--k-color-primary)' : '#60a5fa'"
                  :textColor="isAdmin(project) ? 'var(--k-color-primary)' : '#60a5fa'"
                />
              </div>

              <!-- Name + Description (clickable → project detail) -->
              <div class="card-main" @click="router.push(`/projects/${project.id_proyecto}`)">
                <p class="card-name">{{ project.nombre }}</p>
                <p class="card-desc">{{ project.descripcion || $t('projects.noDescription') }}</p>
              </div>

              <!-- Progress + Budget + Footer -->
              <div class="card-body">
                <div class="progress-wrap">
                  <div class="progress-bg" style="flex:1">
                    <div class="progress-fill" :style="{ width: statusProgress(project.estado) + '%', backgroundColor: statusColor(project.estado) }"></div>
                  </div>
                  <span class="progress-val">{{ statusProgress(project.estado) }}%</span>
                </div>

                <div class="budget-line">
                  <div class="budget-labels">
                    <span>{{ $t('projects.budget') }}</span>
                    <span class="budget-val">${{ budgetSpent(project) }} / ${{ budgetTotal(project) }}</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" :style="{ width: budgetPct(project) + '%', backgroundColor: budgetColor(project) }"></div>
                  </div>
                  <div class="budget-meta">
                    <span :style="{ color: budgetColor(project) }">{{ $t('projects.budgetUsed', { pct: budgetPct(project) }) }}</span>
                    <span v-if="budgetByProj[project.id_proyecto]?.alerta_nivel"
                          class="alert-pill"
                          :class="isCriticalBudgetLevel(budgetByProj[project.id_proyecto].alerta_nivel) ? 'critical' : 'warn'">
                      {{ isCriticalBudgetLevel(budgetByProj[project.id_proyecto].alerta_nivel) ? $t('projects.overrun') : $t('projects.warning') }}
                    </span>
                  </div>
                </div>

                <div class="card-footer-row">
                  <template v-if="canEditStatus(project)">
                    <div class="status-select-wrap" :style="{ '--status-color': statusColor(project.estado) }">
                      <span class="status-dot-mark" :style="{ backgroundColor: statusColor(project.estado) }"></span>
                      <select
                        class="status-select"
                        :value="project.estado"
                        :disabled="statusUpdating[project.id_proyecto]"
                        @change="updateProjectStatus(project, $event.target.value)"
                      >
                        <option v-for="e in ESTADOS" :key="e.value" :value="e.value">{{ e.label }}</option>
                      </select>
                    </div>
                  </template>
                  <Pill
                    v-else
                    :label="statusLabel(project.estado)"
                    :btnColor="statusColor(project.estado) + '18'"
                    :circleColor="statusColor(project.estado)"
                    :textColor="statusColor(project.estado)"
                  />
                  <span class="due-date">
                    {{ project.fecha_fin_planificada ? $t('projects.dueDate', { date: formatDate(project.fecha_fin_planificada) }) : $t('projects.noDueDate') }}
                  </span>
                </div>
                <p v-if="statusError[project.id_proyecto]" class="status-error">
                  {{ statusError[project.id_proyecto] }}
                </p>
              </div>

              <!-- Quick access row -->
              <div class="card-quick-row">
                <button class="quick-btn" @click="router.push(`/projects/${project.id_proyecto}?tab=tasks`)">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 3.5h10M1.5 6.5h7M1.5 9.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                  <span>{{ $t('projects.list.quickActions.tasks') }}</span>
                </button>
                <button class="quick-btn" @click="router.push(`/projects/${project.id_proyecto}?tab=team`)">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="4.5" cy="4" r="2" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M1 11.5c0-1.9 1.6-3.5 3.5-3.5S8 9.6 8 11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                    <path d="M9 5.5c1.1.3 2 1.3 2 2.5M11 11.5c0-1.4-.9-2.6-2.5-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                  </svg>
                  <span>{{ $t('projects.list.quickActions.team') }}</span>
                </button>
                <button class="quick-btn" @click="openBudget(project)">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M6.5 4v.8M6.5 8.2V9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    <path d="M5 7.8c0 .7.7 1.2 1.5 1.2S8 8.5 8 7.8C8 6.4 5 6.7 5 5.4 5 4.7 5.7 4.2 6.5 4.2S8 4.7 8 5.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                  </svg>
                  <span>{{ $t('projects.list.quickActions.budget') }}</span>
                </button>
                <button class="quick-btn" @click="router.push({ name: 'reports', query: { project: project.id_proyecto } })">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 11V7M4.5 11V4.5M7 11V2M9.5 11V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                    <path d="M1 12h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                  <span>{{ $t('projects.list.quickActions.reports') }}</span>
                </button>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="filteredProjects.length === 0" class="empty-state">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="10" width="28" height="22" rx="2" stroke="var(--k-color-border)" stroke-width="1.5"/>
                <path d="M6 15h28M13 10V8M27 10V8" stroke="var(--k-color-border)" stroke-width="1.5" stroke-linecap="square"/>
                <path d="M13 22h14M13 27h8" stroke="var(--k-color-border)" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              <p class="empty-title">{{ $t('projects.list.empty.title') }}</p>
              <p class="empty-sub">{{ searchQuery ? $t('projects.list.empty.search') : $t('projects.list.empty.noFilter') }}</p>
              <button v-if="authStore.canCreateProjects && !searchQuery" class="btn-primary empty-cta" @click="openModal">
                <span>{{ $t('projects.list.empty.cta') }}</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Context panel -->
        <aside class="context-panel">
          <div class="ctx-title">{{ $t('projects.list.context.title') }}</div>
          <div class="ctx-subtitle">{{ $t('projects.list.context.subtitle') }}</div>

          <div>
            <p class="ctx-label">{{ $t('projects.list.context.atAGlance') }}</p>
            <div class="summary-grid">
              <div class="summary-card">
                <span class="s-value">{{ projects.length }}</span>
                <span class="s-label">{{ $t('projects.list.context.totalProjects') }}</span>
                <span class="s-sub">{{ $t('projects.list.context.asAdmin', { count: asAdminCount }) }}</span>
              </div>
              <div class="summary-card">
                <span class="s-value" style="color:var(--k-state-error-text)">{{ atRiskCount }}</span>
                <span class="s-label">{{ $t('projects.list.context.atRisk') }}</span>
                <span class="s-sub red">{{ $t('projects.list.context.needsAttention') }}</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ completedCount }}</span>
                <span class="s-label">{{ $t('projects.list.context.completed') }}</span>
                <span class="s-sub">{{ $t('projects.list.context.thisQuarter') }}</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ pausedCount }}</span>
                <span class="s-label">{{ $t('projects.list.context.paused') }}</span>
                <span class="s-sub gold">{{ $t('projects.list.context.awaitingBudget') }}</span>
              </div>
            </div>
          </div>

          <div>
            <p class="ctx-label">{{ $t('projects.list.context.quickActions') }}</p>
            <Button v-if="authStore.canCreateProjects" :label="$t('projects.list.context.createNew')" @click="openModal" />
            <Button :label="$t('projects.list.context.export')" />
          </div>

          <div class="data-source">
            <div class="ds-label">{{ $t('projects.list.context.dataSource') }}</div>
            <div class="ds-text">{{ $t('projects.list.context.dataSourceText', { time: lastSync }) }}</div>
          </div>
        </aside>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '../components/AppNavbar.vue'
import BaseModal from '../components/UI/Modal/BaseModal.vue'
import Pill      from '../components/UI/Pill/Pill.vue'
import Button    from '../components/UI/Button/Button.vue'
import { statusLabel, formatDate } from '../utils/statusHelpers.js'

const { t } = useI18n()
const router = useRouter()

const authStore    = useAuthStore()
const projects     = ref([])
const searchQuery  = ref('')
const viewMode     = ref(localStorage.getItem('projects-view-mode') || 'grid')
watch(viewMode, (v) => localStorage.setItem('projects-view-mode', v))
const budgetByProj = ref({}) // id_proyecto -> summary
const loading      = ref(true)
const authError  = ref(false)
const fetchError = ref(null)
const activeTab  = ref('all')
const lastSync   = ref('—')

const ESTADOS = computed(() => [
  { value: 'PLANIFICADO', label: t('projects.statuses.planned')    },
  { value: 'EN_PROGRESO', label: t('projects.statuses.inProgress') },
  { value: 'PAUSADO',     label: t('projects.statuses.paused')     },
  { value: 'COMPLETADO',  label: t('projects.statuses.completed')  },
  { value: 'CANCELADO',   label: t('projects.statuses.cancelled')  },
])

// TODO SCRUM-16: STATUS_COLOR se queda en hex porque el template lo concatena
// (`:btnColor="statusColor(project.estado) + '18'"`) para formar un hex con
// alpha, y var() no admite concatenacion. Ademas #60a5fa (azul) y #f97316
// (naranja) no tienen equivalente en la paleta v2.
const STATUS_COLOR = {
  PLANIFICADO: '#60a5fa',
  EN_PROGRESO: 'var(--k-state-success-text)',
  PAUSADO:     '#f97316',
  COMPLETADO:  'var(--k-color-primary)',
  CANCELADO:   'var(--k-state-error-text)',
}
const STATUS_PROGRESS = {
  PLANIFICADO: 10,
  EN_PROGRESO: 60,
  PAUSADO:     35,
  COMPLETADO:  100,
  CANCELADO:   5,
}

const statusColor    = (e) => STATUS_COLOR[e]    || 'var(--k-text-dim)'
const statusProgress = (e) => STATUS_PROGRESS[e] ?? 0
const isAdmin        = (p) => p.id_encargado === authStore.idUsuario

function isCriticalBudgetLevel(level) {
  return ['CRITICO', 'EXCEDIDO'].includes(level)
}

function isWarningBudgetLevel(level) {
  return ['PRECAUCION', 'ADVERTENCIA'].includes(level)
}

// ── Budget helpers ────────────────────────────────────────────────────────────
const money = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const budgetTotal  = (p) => money(budgetByProj.value[p.id_proyecto]?.presupuesto_total ?? p.presupuesto_total)
const budgetSpent  = (p) => money(budgetByProj.value[p.id_proyecto]?.total_gastado ?? 0)
const budgetPct    = (p) => budgetByProj.value[p.id_proyecto]?.porcentaje_completado ?? 0
const budgetColor  = (p) => {
  const lvl = budgetByProj.value[p.id_proyecto]?.alerta_nivel
  if (isCriticalBudgetLevel(lvl)) return 'var(--k-state-error-text)'
  if (isWarningBudgetLevel(lvl)) return '#f97316' // TODO SCRUM-16: sin token de aviso claro
  return 'var(--k-color-primary)'
}
function openBudget(p) {
  router.push({ name: 'budget', query: { project: p.id_proyecto } })
}
// ── API ───────────────────────────────────────────────────────────────────────

function authHeader() {
  const token   = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
  return headers
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { headers: { ...authHeader(), ...options.headers }, ...options })
  if (res.status === 401) throw Object.assign(new Error('unauthenticated'), { status: 401 })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function loadData() {
  loading.value    = true
  authError.value  = false
  fetchError.value = null
  try {
    if (!authStore.user) await authStore.fetchMe()

    const params = new URLSearchParams({ limit: 100 })
    const res = await apiFetch(`/api/projects?${params}`)
    projects.value = res.data
    lastSync.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    // Load budget summaries in parallel (best-effort)
    const summaries = await Promise.allSettled(
      projects.value.map(p =>
        apiFetch(`/api/budgets/project/${p.id_proyecto}/summary`).then(r => [p.id_proyecto, r.data])
      )
    )
    const map = {}
    for (const s of summaries) {
      if (s.status === 'fulfilled') { map[s.value[0]] = s.value[1] }
    }
    budgetByProj.value = map
  } catch (err) {
    if (err.status === 401) authError.value = true
    else fetchError.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(() => authStore.idEmpresaActual, loadData)

// ── Computed counts ───────────────────────────────────────────────────────────

const asAdminCount   = computed(() => projects.value.filter(p => isAdmin(p)).length)
const atRiskCount    = computed(() => projects.value.filter(p => ['PAUSADO', 'CANCELADO'].includes(p.estado)).length)
const completedCount = computed(() => projects.value.filter(p => p.estado === 'COMPLETADO').length)
const pausedCount    = computed(() => projects.value.filter(p => p.estado === 'PAUSADO').length)

const tabs = computed(() => [
  { key: 'all',       label: t('projects.list.tabs.all'),       count: projects.value.length },
  { key: 'active',    label: t('projects.list.tabs.active'),    count: projects.value.filter(p => p.estado === 'EN_PROGRESO').length },
  { key: 'risk',      label: t('projects.list.tabs.atRisk'),    count: atRiskCount.value },
  { key: 'completed', label: t('projects.list.tabs.completed'), count: completedCount.value },
])

const filteredProjects = computed(() => {
  let list = projects.value
  if (activeTab.value === 'active')         list = list.filter(p => p.estado === 'EN_PROGRESO')
  else if (activeTab.value === 'risk')      list = list.filter(p => ['PAUSADO', 'CANCELADO'].includes(p.estado))
  else if (activeTab.value === 'completed') list = list.filter(p => p.estado === 'COMPLETADO')
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(p => p.nombre.toLowerCase().includes(q))
  return list
})

// ── Modal ─────────────────────────────────────────────────────────────────────

const showModal    = ref(false)
const modalLoading = ref(false)
const modalError   = ref(null)

const emptyForm = () => ({
  nombre:               '',
  descripcion:          '',
  fecha_inicio:         new Date().toISOString().split('T')[0],
  fecha_fin_planificada:'',
  presupuesto_total:    null,
  estado:               'PLANIFICADO',
})

const form = ref(emptyForm())

function openModal() {
  if (!authStore.canCreateProjects) return
  form.value       = emptyForm()
  modalError.value = null
  showModal.value  = true
}

const statusUpdating = ref({}) // id_proyecto -> bool
const statusError    = ref({}) // id_proyecto -> message

function canEditStatus(p) {
  if (isAdmin(p)) return true
  const role = authStore.empresaActual?.rol
  return ['owner', 'admin', 'manager'].includes(role)
}

async function updateProjectStatus(project, newEstado) {
  if (!newEstado || newEstado === project.estado) return
  statusUpdating.value = { ...statusUpdating.value, [project.id_proyecto]: true }
  statusError.value = { ...statusError.value, [project.id_proyecto]: null }
  const previous = project.estado
  project.estado = newEstado // optimistic
  try {
    const res = await fetch(`/api/projects/${project.id_proyecto}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ estado: newEstado }),
    })
    const data = await res.json()
    if (!res.ok) {
      project.estado = previous
      statusError.value = { ...statusError.value, [project.id_proyecto]: data.message || `Error ${res.status}` }
    }
  } catch {
    project.estado = previous
    statusError.value = { ...statusError.value, [project.id_proyecto]: t('projects.list.networkError') }
  } finally {
    statusUpdating.value = { ...statusUpdating.value, [project.id_proyecto]: false }
  }
}
async function submitProject() {
  modalLoading.value = true
  modalError.value   = null
  try {
    const body = {
      nombre:            form.value.nombre,
      descripcion:       form.value.descripcion || undefined,
      fecha_inicio:      form.value.fecha_inicio,
      presupuesto_total: form.value.presupuesto_total,
      estado:            form.value.estado,
    }
    if (form.value.fecha_fin_planificada) {
      body.fecha_fin_planificada = form.value.fecha_fin_planificada
    }

    const res = await fetch('/api/projects', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      modalError.value = data.message || `Error ${res.status}`
      return
    }
    showModal.value = false
    await loadData()
  } catch {
    modalError.value = 'Network error, try again.'
  } finally {
    modalLoading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.projects-root { background: transparent; min-height: 100vh; }

.projects-layout {
  font-family: var(--k-font-sans); color: var(--k-color-text);
  min-height: calc(100vh - 56px); margin-top: 56px;
  display: flex; overflow-x: hidden;
}

.state-screen {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  background: var(--k-color-bg);
}
.state-title { font-family: var(--k-font-display); font-size: var(--k-font-size-heading-1); color: var(--k-color-text); }
.state-msg   { font-size: var(--k-font-size-body-main); color: var(--k-text-muted); }

.main-panel {
  flex: 1; display: flex; flex-direction: column; gap: 32px;
  padding: 32px 56px 48px; background: var(--k-color-bg);
}

.proj-header        { display: flex; align-items: flex-start; justify-content: space-between; }
.proj-header-left   { display: flex; flex-direction: column; gap: 4px; }
.proj-title         { font-family: var(--k-font-display); font-size: var(--k-font-size-display); font-weight: 400; color: var(--k-color-text); line-height: 1.1; }
.proj-subtitle      { font-size: var(--k-font-size-body-main); color: var(--k-text-muted); }
.proj-header-actions{ display: flex; gap: 12px; align-items: center; margin-top: 8px; }

.btn-primary {
  display: flex; align-items: center; gap: 8px;
  background: var(--k-color-primary); padding: 10px 18px; cursor: pointer; border: none;
}
.btn-primary span { font-size: var(--k-font-size-caption); color: var(--k-form-btn-text); white-space: nowrap; font-family: var(--k-font-sans); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.icon-btn {
  width: 40px; height: 40px; border: 1px solid var(--k-color-border); background: var(--k-color-tertiary);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.icon16 { width: 16px; height: 16px; flex-shrink: 0; }
.icon18 { width: 18px; height: 18px; flex-shrink: 0; }

.tabs { display: flex; gap: 32px; border-bottom: 1px solid var(--k-color-border); }
.tab {
  background: none; border: none; cursor: pointer;
  font-family: var(--k-font-sans); font-size: var(--k-font-size-body-main); color: var(--k-text-dim);
  padding-bottom: 12px; border-bottom: 2px solid transparent; transition: color 0.15s;
}
.tab.active { color: var(--k-color-primary); border-bottom-color: var(--k-color-primary); }
.tab:hover:not(.active) { color: var(--k-text-muted); }

.section-header  { display: flex; justify-content: space-between; align-items: center; }
.section-title   { font-family: var(--k-font-display); font-size: var(--k-font-size-heading-1); color: var(--k-color-text); }
.section-meta    { font-size: var(--k-font-size-caption); color: var(--k-text-faint); }
.section-controls { display: flex; align-items: center; gap: 10px; }

/* Search */
.search-wrap {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--k-color-border); background: var(--k-color-tertiary);
  padding: 6px 12px; transition: border-color 0.15s;
}
.search-wrap:focus-within { border-color: rgba(var(--k-color-primary-rgb), 0.4); }
.search-icon { color: var(--k-text-faint); flex-shrink: 0; }
.search-input {
  background: var(--k-color-tertiary); border: none; outline: none;
  color: var(--k-color-text); font-family: var(--k-font-sans); font-size: var(--k-font-size-body-main); width: 180px;
}
.search-input::placeholder { color: var(--k-text-faint); }
.search-clear {
  background: none; border: none; color: var(--k-text-faint); cursor: pointer;
  font-size: 16px; padding: 0; line-height: 1; transition: color 0.15s;
}
.search-clear:hover { color: var(--k-text-muted); }

/* View toggle */
.view-toggle { display: flex; border: 1px solid var(--k-color-border); }
.vt-btn {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  background: var(--k-color-tertiary); border: none; color: var(--k-text-faint); cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.vt-btn.active { color: var(--k-form-btn-text); background: var(--k-color-primary); }
.vt-btn:hover:not(.active) { color: var(--k-text-muted); }

.project-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}

/* List view */
.project-list { display: flex; flex-direction: column; gap: 1px; background: var(--k-color-bg-3); }

.list-header {
  display: grid;
  grid-template-columns: 3px 1fr 150px 190px 100px 140px 80px;
  background: var(--k-color-tertiary);
  border-bottom: 1px solid var(--k-color-border);
  position: sticky; top: 56px; z-index: 1;
}
.lh-spacer { }
.lh-col {
  padding: 8px 16px;
  font-size: var(--k-font-size-body-main);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--k-text-faint);
  font-family: var(--k-font-sans);
}
.lh-col:first-of-type { padding-left: 20px; }
.lh-center { text-align: center; }

.list-row {
  display: grid;
  grid-template-columns: 3px 1fr 150px 190px 100px 140px 80px;
  align-items: center;
  background: var(--k-color-tertiary);
  cursor: pointer;
  min-height: 64px;
  transition: background 0.15s;
}
.list-row:hover { background: var(--k-color-tertiary); }

.lr-accent { height: 100%; }

.lr-info { padding: 12px 20px; min-width: 0; }
.lr-name {
  font-family: var(--k-font-display); font-size: var(--k-font-size-body-large); color: var(--k-color-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color 0.15s; margin-bottom: 4px;
}
.list-row:hover .lr-name { color: var(--k-color-primary); }
.lr-meta { display: flex; align-items: center; gap: 6px; min-width: 0; }
.lr-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.lr-status-text { font-size: var(--k-font-size-caption); text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
.lr-meta-sep { color: var(--k-color-border); font-size: var(--k-font-size-caption); flex-shrink: 0; }
.lr-desc { font-size: var(--k-font-size-caption); color: var(--k-text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.lr-progress-col {
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px; border-left: 1px solid var(--k-color-bg-3);
}
.lr-bar-wrap {
  flex: 1; height: 3px; background: var(--k-color-border); border-radius: 2px; overflow: hidden;
}
.lr-bar-fill { height: 100%; transition: width 0.4s; }
.lr-pct { font-size: var(--k-font-size-caption); color: var(--k-text-dim); width: 26px; text-align: right; flex-shrink: 0; }

.lr-budget-col {
  display: flex; align-items: center; gap: 4px;
  padding: 0 16px; border-left: 1px solid var(--k-color-bg-3);
  font-size: var(--k-font-size-caption); color: var(--k-text-faint); white-space: nowrap; overflow: hidden;
}
.lr-budget-spent { color: var(--k-text-muted); }
.lr-budget-sep { color: var(--k-color-border); }

.lr-due-col {
  padding: 0 16px; border-left: 1px solid var(--k-color-bg-3);
  font-size: var(--k-font-size-caption); color: var(--k-text-faint); white-space: nowrap;
}

.lr-actions {
  display: flex; align-items: center; justify-content: center; gap: 2px;
  padding: 0 8px; border-left: 1px solid var(--k-color-bg-3);
}
.lr-btn {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: var(--k-color-tertiary); border: none; color: var(--k-text-faint); cursor: pointer;
  transition: color 0.15s, background 0.15s; border-radius: 2px;
}
.lr-btn:hover { color: var(--k-color-primary); background: var(--k-surface-primary-tint); }

.lr-pill-col {
  display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-left: 1px solid var(--k-color-bg-3);
}
.lr-pill-col :deep(.pill) { height: 20px; padding: 0 10px; border-radius: 3px; border: 1px solid currentColor; }
.lr-pill-col :deep(.pill-text) { font-size: var(--k-font-size-caption); letter-spacing: 0.06em; font-family: var(--k-font-sans); }
.lr-pill-col :deep(.dot) { display: none; }

.project-card {
  background: var(--k-color-tertiary); border: 1px solid var(--k-color-border);
  display: flex; flex-direction: column; transition: border-color 0.2s;
}
.project-card:hover { border-color: var(--k-text-faint); }

.card-accent { height: 3px; flex-shrink: 0; }

/* Status + role row */
.card-status-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px 0;
}
.card-status-left  { display: flex; align-items: center; gap: 6px; }
.card-status-dot   { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.card-status-text  { font-size: var(--k-font-size-body-main); letter-spacing: 0.05em; text-transform: uppercase; }

/* Name + description (clickable) */
.card-main {
  padding: 14px 20px 6px;
  cursor: pointer;
}
.card-name {
  font-family: var(--k-font-display); font-size: var(--k-font-size-heading-1); font-weight: 400; color: var(--k-color-text);
  line-height: 1.2; margin-bottom: 8px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-main:hover .card-name { color: var(--k-color-primary); }

.card-body { padding: 10px 20px 16px; display: flex; flex-direction: column; gap: 14px; }
.card-desc { font-size: var(--k-font-size-body-main); color: var(--k-text-dim); line-height: 1.55;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.progress-wrap { display: flex; align-items: center; gap: 10px; }
.progress-bg   { width: 100%; height: 4px; background: var(--k-color-border); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; transition: width 0.4s; }
.progress-val  { font-size: var(--k-font-size-body-main); color: var(--k-text-dim); width: 36px; text-align: right; }

/* Budget line on project card */
.budget-line { display: flex; flex-direction: column; gap: 4px; }
.budget-labels { display: flex; justify-content: space-between; font-size: var(--k-font-size-body-main); color: var(--k-text-muted); }
.budget-val { color: var(--k-color-text); font-variant-numeric: tabular-nums; }
.budget-meta { display: flex; justify-content: space-between; align-items: center; font-size: var(--k-font-size-body-main); color: var(--k-text-faint); }
.alert-pill {
  font-size: var(--k-font-size-caption); padding: 2px 8px; letter-spacing: 0.05em; border-radius: 2px;
  border: 1px solid currentColor;
}
/* El texto iba del mismo color que el fondo: la píldora salía maciza y la
   palabra dentro era invisible. Fondo con tinte, texto sólido — y sobre
   tokens de paleta, no sobre el naranja y rosa por defecto de Tailwind. */
.alert-pill.warn {
  color: var(--k-alert-warning-text);
  background: var(--k-alert-warning-bg);
  border-color: var(--k-alert-warning-border);
}
.alert-pill.critical {
  color: var(--k-alert-critical-text);
  background: var(--k-alert-critical-bg);
  border-color: var(--k-alert-critical-border);
}

/* Quick access row */
.card-quick-row {
  display: flex;
  border-top: 1px solid rgba(var(--k-color-primary-rgb), 0.15);
  background: var(--k-color-tertiary);
  margin-top: auto;
}
.quick-btn {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 13px 4px;
  background: none; border: none; border-right: 1px solid rgba(var(--k-color-primary-rgb), 0.1);
  color: var(--k-text-muted); font-size: var(--k-font-size-body-main); font-family: var(--k-font-sans);
  cursor: pointer; transition: color 0.2s, background 0.2s;
}
.quick-btn:last-child { border-right: none; }
.quick-btn:hover { color: var(--k-color-primary); background: var(--k-surface-primary-tint); }

.card-footer-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.due-date { font-size: var(--k-font-size-body-main); color: var(--k-text-faint); }

.status-select-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--status-color, var(--k-text-faint));
  background: color-mix(in srgb, var(--status-color, var(--k-text-faint)) 9%, transparent);
  border-radius: 3px;
}
.status-dot-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-select {
  background: var(--k-color-tertiary);
  border: none;
  color: var(--status-color, var(--k-color-text));
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  letter-spacing: 0.03em;
  padding: 0;
  padding-right: 18px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'><path d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='square'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0 center;
  background-size: 9px 7px;
}
.status-select:disabled { opacity: 0.6; cursor: wait; }
.status-select option { background: var(--k-color-tertiary); color: var(--k-color-text); }

.status-error {
  margin-top: 6px;
  font-size: var(--k-font-size-caption);
  color: var(--k-state-error-text);
  font-family: var(--k-font-sans);
}

.card-open {
  border-top: 1px solid var(--k-color-bg-3);
  padding: 10px 16px;
}
.open-link { font-size: var(--k-font-size-caption); color: var(--k-text-faint); cursor: pointer; transition: color 0.15s; }
.project-card:hover .open-link { color: var(--k-color-primary); }

.card-status-row :deep(.pill) { height: 20px; padding: 0 10px; border-radius: 3px; border: 1px solid currentColor; }
.card-status-row :deep(.pill-text) { font-size: var(--k-font-size-caption); letter-spacing: 0.06em; font-family: var(--k-font-sans); }
.card-status-row :deep(.dot) { display: none; }

.card-footer-row :deep(.pill) { height: 20px; padding: 0 8px; border-radius: 3px; border: 1px solid currentColor; }
.card-footer-row :deep(.pill-text) { font-size: var(--k-font-size-caption); font-family: var(--k-font-sans); }
.card-footer-row :deep(.dot) { width: 6px; height: 6px; margin-right: 6px; }

.modal-actions :deep(.btn) { border-radius: 0; font-family: var(--k-font-sans); font-size: var(--k-font-size-caption); font-weight: 600; padding: 10px 20px; }
.modal-actions :deep(.btn:first-child) { background: var(--k-color-tertiary); border: 1px solid var(--k-color-border); color: var(--k-color-text); }
.modal-actions :deep(.btn:last-child)  { background: var(--k-color-primary); color: var(--k-form-btn-text); }
.modal-actions :deep(.btn:last-child:disabled) { opacity: 0.6; }

.context-panel :deep(.btn) {
  width: 100%; border-radius: 0; font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption); font-weight: 600; padding: 12px 16px;
  display: block; margin-bottom: 8px; text-align: left;
}
.context-panel :deep(.btn:first-of-type) { background: var(--k-color-primary); color: var(--k-form-btn-text); }
.context-panel :deep(.btn:last-of-type)  { background: var(--k-color-tertiary); border: 1px solid var(--k-color-border); color: var(--k-color-text); }

.project-card.skeleton { pointer-events: none; }
.skeleton-accent { height: 3px; background: var(--k-color-border); }
.skeleton-body   { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.skeleton-line   { height: 10px; background: var(--k-color-bg-3); border-radius: 2px; animation: pulse 1.4s ease-in-out infinite; }
.skeleton-line.short { width: 50%; }
.skeleton-line.mid   { width: 70%; }
@keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.8 } }

.empty-state {
  grid-column: 1/-1; display: flex; flex-direction: column;
  align-items: center; gap: 12px; padding: 72px 0; text-align: center;
}
.empty-title { font-family: var(--k-font-display); font-size: var(--k-font-size-heading-1); color: var(--k-text-faint); }
.empty-sub   { font-size: var(--k-font-size-body-main); color: var(--k-text-faint); }
.empty-cta   { margin-top: 4px; }

.context-panel {
  width: 320px; flex: none;
  background: var(--k-color-bg); border-left: 1px solid var(--k-color-bg-3);
  padding: 48px 28px; display: flex; flex-direction: column; gap: 32px;
  position: sticky; top: 0; max-height: 100vh; overflow-y: auto;
}

.ctx-title    { font-family: var(--k-font-display); font-size: var(--k-font-size-heading-1); color: var(--k-color-text); }
.ctx-subtitle { font-size: var(--k-font-size-body-main); color: var(--k-text-faint); margin-top: 4px; }
.ctx-label    { font-size: var(--k-font-size-caption); letter-spacing: 0.1em; color: var(--k-text-faint); margin-bottom: 12px; }

.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.summary-card {
  background: var(--k-color-tertiary); border: 1px solid var(--k-color-bg-3);
  padding: 14px; display: flex; flex-direction: column; gap: 4px;
}
.s-value { font-size: var(--k-font-size-heading-1); font-weight: 700; color: var(--k-color-text); line-height: 1; }
.s-label { font-size: var(--k-font-size-caption); color: var(--k-text-faint); }
.s-sub   { font-size: var(--k-font-size-caption); color: var(--k-text-faint); }
.s-sub.gold { color: var(--k-color-primary); }
.s-sub.red  { color: var(--k-state-error-text); }

.data-source { margin-top: auto; }
.ds-label { font-size: var(--k-font-size-caption); letter-spacing: 0.1em; color: var(--k-text-faint); margin-bottom: 4px; }
.ds-text  { font-size: var(--k-font-size-caption); color: var(--k-text-faint); }

/* Modal form styles */
.modal-form  { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: var(--k-font-size-caption); color: var(--k-text-muted); letter-spacing: 0.05em; }
.form-field input,
.form-field textarea,
.form-field select {
  background: var(--k-color-tertiary); border: 1px solid var(--k-color-border);
  color: var(--k-color-text); font-family: var(--k-font-sans); font-size: var(--k-font-size-body-main);
  padding: 10px 12px; outline: none; resize: none; transition: border-color 0.15s;
}
.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus { border-color: var(--k-color-primary); }
.form-field select option { background: var(--k-color-tertiary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.req { color: var(--k-color-primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-error   { font-size: var(--k-font-size-caption); color: var(--k-state-error-text); }

@media (max-width: 1200px) {
  .main-panel { padding: 40px 40px; }
  .context-panel { width: 280px; padding: 40px 20px; }
  .project-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 900px) {
  .projects-layout { flex-direction: column; }
  .main-panel { padding: 32px 28px; gap: 24px; }
  .proj-title { font-size: 36px; }
  .context-panel {
    width: 100%; max-height: none; position: static;
    border-left: none; border-top: 1px solid var(--k-color-bg-3);
    padding: 32px 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
  }
  .ctx-title { grid-column: 1 / -1; }
  .data-source { grid-column: 1 / -1; margin-top: 0; }
  .summary-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 640px) {
  .main-panel { padding: 24px 16px; gap: 20px; }
  .proj-title { font-size: var(--k-font-size-heading-1); }
  .proj-header { flex-direction: column; gap: 16px; }
  .proj-header-actions { align-self: flex-start; }
  .tabs { gap: 16px; overflow-x: auto; }
  .context-panel { grid-template-columns: 1fr; padding: 24px 16px; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .project-grid { grid-template-columns: 1fr; }

}
</style>
