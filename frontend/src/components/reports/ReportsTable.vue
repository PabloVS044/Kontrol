<template>
  <div class="section-block">
    <div class="section-header">
      <span class="section-title">Active Reports</span>
      <button class="view-all-btn">View all reports -></button>
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
            <th>Report Name</th>
            <th>Project</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
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
                Open ->
              </button>
            </td>
          </tr>
          <tr v-if="projects.length === 0">
            <td colspan="5" class="empty-row">No projects found.</td>
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
  color: #faf8f5;
}

.view-all-btn,
.open-btn {
  background: #111111;
  border: none;
  color: #555;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
}

.view-all-btn:hover,
.open-btn:hover { color: #c9a962; }

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
  color: #444;
  font-size: 10px;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 0 0 10px;
}

.rep-row {
  cursor: pointer;
  border-top: 1px solid #161616;
}

.rep-row:hover { background: #111111; }
.rep-table td { padding: 12px 0; color: #777; }
.td-name { color: #faf8f5 !important; font-weight: 600; }
.proj-badge {
  display: inline-flex;
  border: 1px solid #222;
  padding: 3px 7px;
  color: #777;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 2px;
  font-size: 10px;
  letter-spacing: .04em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.empty-row {
  text-align: center;
  color: #555 !important;
  padding: 28px 0 !important;
}

@keyframes pulse {
  0%, 100% { opacity: .45; }
  50% { opacity: .85; }
}
</style>
