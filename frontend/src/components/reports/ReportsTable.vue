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
  background: #111111;
  border: 1px solid #1e1e1e;
  padding: 18px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: var(--Text);
}

.view-all-btn,
.open-btn {
  background: #111111;
  border: none;
  color: var(--TextFaint);
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
}

.view-all-btn:hover,
.open-btn:hover { color: var(--Primary); }

.table-skeleton { display: flex; flex-direction: column; gap: 10px; }
.table-skel-row { display: flex; gap: 12px; }
.skel-cell {
  height: 12px;
  background: #1a1a1a;
  border-radius: 2px;
  animation: pulse 1.4s ease-in-out infinite;
}

.rep-table-wrap { overflow-x: auto; }
.rep-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
}

.rep-table th {
  text-align: left;
  color: var(--TextFaint);
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 0 0 10px;
}

.rep-row {
  cursor: pointer;
  border-top: 1px solid #161616;
}

.rep-row:hover { background: #111111; }
.rep-table td { padding: 12px 0; color: var(--TextDim); }
.td-name { color: var(--Text) !important; font-weight: 600; }
.proj-badge {
  display: inline-flex;
  border: 1px solid #222;
  padding: 3px 7px;
  color: var(--TextDim);
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 2px;
  font-size: 11px;
  letter-spacing: .04em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.empty-row {
  text-align: center;
  color: var(--TextFaint) !important;
  padding: 28px 0 !important;
}

@keyframes pulse {
  0%, 100% { opacity: .45; }
  50% { opacity: .85; }
}
</style>
