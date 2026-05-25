<template>
  <aside class="context-panel">
    <div class="ctx-title">{{ $t('projects.list.context.title') }}</div>
    <div class="ctx-subtitle">{{ $t('projects.list.context.subtitle') }}</div>

    <div>
      <p class="ctx-label">{{ $t('projects.list.context.atAGlance') }}</p>
      <div class="summary-grid">
        <div class="summary-card">
          <span class="s-value">{{ totalProjects }}</span>
          <span class="s-label">{{ $t('projects.list.context.totalProjects') }}</span>
          <span class="s-sub">{{ $t('projects.list.context.asAdmin', { count: adminCount }) }}</span>
        </div>
        <div class="summary-card">
          <span class="s-value" style="color:#fb7185">{{ atRiskCount }}</span>
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
      <Button
        v-if="canCreateProjects"
        :label="$t('projects.list.context.createNew')"
        @click="$emit('create-project')"
      />
      <Button :label="$t('projects.list.context.export')" />
    </div>

    <div class="data-source">
      <div class="ds-label">{{ $t('projects.list.context.dataSource') }}</div>
      <div class="ds-text">{{ $t('projects.list.context.dataSourceText', { time: lastSync }) }}</div>
    </div>
  </aside>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import Button from '../UI/Button/Button.vue'

const { t } = useI18n()

defineProps({
  totalProjects: Number,
  adminCount: Number,
  atRiskCount: Number,
  completedCount: Number,
  pausedCount: Number,
  lastSync: String,
  canCreateProjects: Boolean
})

defineEmits(['create-project'])
</script>

<style scoped>
.context-panel {
  width: 320px;
  flex: none;
  background: rgba(10,10,10,0.9);
  border-left: 1px solid #1a1a1a;
  padding: 48px 28px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ctx-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  color: #faf8f5;
}
.ctx-subtitle {
  font-size: 13px;
  color: #555;
  margin-top: 4px;
}
.ctx-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #444;
  margin-bottom: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.summary-card {
  background: #0f0f0f;
  border: 1px solid #1a1a1a;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.s-value {
  font-size: 28px;
  font-weight: 700;
  color: #faf8f5;
  line-height: 1;
}
.s-label {
  font-size: 11px;
  color: #555;
}
.s-sub {
  font-size: 10px;
  color: #444;
}
.s-sub.gold { color: #c9a962; }
.s-sub.red { color: #fb7185; }

:deep(.btn) {
  width: 100%;
  border-radius: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 12px 16px;
  display: block;
  margin-bottom: 8px;
  text-align: left;
}
:deep(.btn):first-of-type {
  background: #c9a962;
  color: #0a0a0a;
}
:deep(.btn):last-of-type {
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
}

.data-source {
  margin-top: auto;
}
.ds-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #333;
  margin-bottom: 4px;
}
.ds-text {
  font-size: 11px;
  color: #444;
}
</style>

