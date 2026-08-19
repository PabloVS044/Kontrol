<template>
  <div class="section-block">
    <div class="section-header">
      <span class="section-title">{{ $t('reports.table.title') }}</span>
      <button class="view-all-btn">{{ $t('reports.table.viewAll') }}</button>
    </div>

    <div v-if="loading" class="table-skeleton">
      <div v-for="n in 4" :key="n" class="table-skel-row">
        <div class="skel-cell" style="width:30%"></div>
        <div class="skel-cell" style="width:20%"></div>
        <div class="skel-cell" style="width:15%"></div>
        <div class="skel-cell" style="width:20%"></div>
        <div class="skel-cell" style="width:15%"></div>
      </div>
    </div>

    <div v-else class="rep-table-wrap">
      <table class="rep-table">
        <thead>
          <tr>
            <th>{{ $t('reports.table.colName') }}</th>
            <th>{{ $t('reports.table.colProject') }}</th>
            <th>{{ $t('reports.table.colStatus') }}</th>
            <th>{{ $t('reports.table.colDate') }}</th>
            <th>{{ $t('reports.table.colAction') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="project in projects"
            :key="project.id_proyecto"
            class="rep-row"
            @click="$emit('open', project.id_proyecto)"
          >
            <td class="td-name">{{ project.nombre }}</td>
            <td class="td-project">
              <span class="proj-badge">{{ project.nombre }}</span>
            </td>
            <td class="td-status">
              <span
                class="status-tag"
                :style="{
                  color: statusPill(project.estado).color,
                  background: statusPill(project.estado).bg,
                }"
              >
                <span class="status-dot" :style="{ background: statusPill(project.estado).color }"></span>
                {{ statusPill(project.estado).label }}
              </span>
            </td>
            <td class="td-date">{{ formatDate(project.fecha_inicio) }}</td>
            <td class="td-action">
              <button class="open-btn" @click.stop="$emit('open', project.id_proyecto)">
                {{ $t('reports.table.open') }}
              </button>
            </td>
          </tr>
          <tr v-if="projects.length === 0">
            <td colspan="5" class="empty-row">{{ $t('reports.table.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { formatDate, statusPill } from '../../utils/statusHelpers.js'

defineProps({
  projects: { type: Array, default: () => [] },
  loading: Boolean,
})

defineEmits(['open'])
</script>

<style scoped>
.section-block {
  background: var(--Background2);
  border: var(--k-border-width)
  solid var(--Border);
  padding: var(--k-space-5);
  margin-bottom: var(--k-space-6);
  border-radius: var(--k-radius-md);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--k-space-3);
  margin-bottom: var(--k-space-4);
}

.section-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  color: var(--Text);
}

.view-all-btn,
.open-btn {
  background: transparent;
  border: none;
  color: var(--TextMuted);
  cursor: pointer;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  transition: var(--k-transition-ui);
}

.view-all-btn:hover,
.open-btn:hover { color: var(--Primary); }

.table-skeleton { display: flex; flex-direction: column; gap: var(--k-space-2); }

.table-skel-row { display: flex; gap: var(--k-space-3); }

.skel-cell {
  height: var(--k-space-3);
  background: var(--Background3);
  border-radius: var(--k-radius-sm);
  animation: pulse 1.4s ease-in-out infinite;
}

.rep-table-wrap { overflow-x: auto; }

.rep-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
}

.rep-table th {
  text-align: left;
  color: var(--TextMuted);
  font-size: var(--k-font-size-caption);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
  padding: var(--k-space-3);
  padding-bottom: var(--k-space-2);
}

.rep-row {
  cursor: pointer;
  border-top: var(--k-border-width) solid var(--Border);
}

.rep-row:hover { background: var(--k-surface-hover-subtle); }

.rep-table td { padding: var(--k-space-3); color: var(--k-text-soft); vertical-align: middle; }

.td-name { color: var(--Text) !important; font-weight: 600; }

.proj-badge {
  display: inline-flex;
  border: var(--k-border-width) solid var(--Border);
  padding: var(--k-space-1) var(--k-space-2);
  color: var(--TextMuted);
  font-size: var(--k-font-size-caption);
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--k-space-1);
  padding: var(--k-space-1) var(--k-space-2);
  border-radius: var(--k-radius-sm);
  font-size: var(--k-font-size-caption);
  letter-spacing: .04em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.empty-row {
  text-align: center;
  color: var(--TextDim) !important;
  padding: var(--k-space-5) 0 !important;
}

@keyframes pulse {
  0%, 100% { opacity: .45; }
  50% { opacity: .85; }
}
</style>
