<template>
  <aside v-if="project" class="side-panel">
    <div class="side-section">
      <p class="side-label">{{ $t('reports.detail.sideHealth') }}</p>
      <div class="health-card" :class="healthClass">
        <span class="health-dot"></span>
        <div>
          <span class="health-text">{{ healthText }}</span>
          <span class="health-sub">{{ healthSub }}</span>
        </div>
      </div>
    </div>

    <div class="side-divider"></div>

    <div class="side-section">
      <p class="side-label">{{ $t('reports.detail.sideStats') }}</p>
      <div class="qstat-list">
        <div class="qstat">
          <span class="qstat-label">{{ $t('reports.detail.sideDaysActive') }}</span>
          <span class="qstat-val">{{ daysActive }}</span>
        </div>
        <div class="qstat">
          <span class="qstat-label">{{ $t('reports.detail.sideDaysRemaining') }}</span>
          <span class="qstat-val" :class="typeof daysRemaining === 'number' && daysRemaining < 7 ? 'red' : ''">
            {{ daysRemaining }}
          </span>
        </div>
        <div class="qstat">
          <span class="qstat-label">{{ $t('reports.detail.sideBudgetPerDay') }}</span>
          <span class="qstat-val">{{ budgetPerDay }}</span>
        </div>
        <div class="qstat">
          <span class="qstat-label">{{ $t('reports.detail.sideVelocity') }}</span>
          <span class="qstat-val gold">{{ mock.velocity }} t/w</span>
        </div>
      </div>
    </div>

    <div class="side-divider"></div>

    <div class="side-section">
      <p class="side-label">{{ $t('reports.detail.sideActions') }}</p>
      <div class="side-actions">
        <Button :label="$t('reports.detail.sideActionGenerate')" />
        <Button :label="$t('reports.detail.sideActionAddMember')" />
        <Button :label="$t('reports.detail.sideActionSettings')" />
      </div>
    </div>

    <div class="side-divider"></div>

    <div class="side-section">
      <p class="side-label">{{ $t('reports.detail.sideProjectInfo') }}</p>
      <div class="info-list">
        <div class="info-row">
          <span class="info-key">{{ $t('reports.detail.sideInfoStatus') }}</span>
          <Pill
            :label="statusPill(project.estado).label"
            :btnColor="statusPill(project.estado).bg"
            :circleColor="statusPill(project.estado).color"
            :textColor="statusPill(project.estado).color"
          />
        </div>
        <div class="info-row">
          <span class="info-key">{{ $t('reports.detail.sideInfoCompany') }}</span>
          <span class="info-val">#{{ project.id_empresa }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">{{ $t('reports.detail.sideInfoManager') }}</span>
          <span class="info-val">#{{ project.id_encargado }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">{{ $t('reports.detail.sideInfoBudget') }}</span>
          <span class="info-val gold">{{ formatBudget(project.presupuesto_total) }}</span>
        </div>
      </div>
    </div>

    <div class="side-divider"></div>

    <div class="side-section">
      <p class="side-label">{{ $t('reports.detail.sideRiskLevel') }}</p>
      <div class="risk-bars">
        <div v-for="risk in mock.risks" :key="risk.label" class="risk-row">
          <span class="risk-label">{{ risk.label }}</span>
          <div class="risk-track">
            <div class="risk-fill" :style="{ width: risk.pct + '%', background: risk.color }"></div>
          </div>
          <span class="risk-val" :style="{ color: risk.color }">{{ risk.level }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import Button from '../UI/Button/Button.vue'
import Pill from '../UI/Pill/Pill.vue'
import { formatBudget, statusPill } from '../../utils/statusHelpers.js'

defineProps({
  project: { type: Object, default: null },
  mock: { type: Object, required: true },
  healthClass: { type: String, required: true },
  healthText: { type: String, required: true },
  healthSub: { type: String, required: true },
  daysActive: { type: [Number, String], required: true },
  daysRemaining: { type: [Number, String], required: true },
  budgetPerDay: { type: String, required: true },
})
</script>

<style scoped>
.side-panel {
  padding: 24px 20px;
  background: rgba(10,10,10,0.9);
  border-left: 1px solid #1e1e1e;
  overflow-y: auto;
}
.side-section { margin-bottom: 16px; }
.side-label {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 10px;
}
.side-divider { height: 1px; background: #1a1a1a; margin: 16px 0; }

.health-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #1e1e1e;
  background: rgba(255,255,255,0.02);
}
.health-dot { width: 8px; height: 8px; border-radius: 50%; background: #333; flex-shrink: 0; }
.health-text {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  display: block;
}
.health-sub {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #333;
  display: block;
}
.health-good .health-dot { background: #4ade80; }
.health-good .health-text { color: #4ade80; }
.health-warn .health-dot { background: #fb923c; }
.health-warn .health-text { color: #fb923c; }
.health-bad .health-dot { background: #fb7185; }
.health-bad .health-text { color: #fb7185; }
.health-neutral .health-dot { background: #60a5fa; }
.health-neutral .health-text { color: #60a5fa; }

.qstat-list { display: flex; flex-direction: column; gap: 0; }
.qstat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #111;
}
.qstat-label { font-family: 'Manrope', sans-serif; font-size: 11px; color: #666; }
.qstat-val { font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 600; color: #aaa; }
.qstat-val.gold { color: #c9a962; }
.qstat-val.red { color: #fb7185; }

.side-actions :deep(.btn) {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid #1a1a1a;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  border-radius: 0;
  margin-bottom: 6px;
  transition: border-color .2s, color .2s;
}
.side-actions :deep(.btn:hover) {
  border-color: rgba(201,169,98,0.3);
  color: #c9a962;
}

.info-list { display: flex; flex-direction: column; gap: 0; }
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #111;
}
.info-row :deep(.pill) {
  padding: 3px 8px;
  font-size: 10px;
}
.info-key { font-family: 'Manrope', sans-serif; font-size: 11px; color: #555; }
.info-val { font-family: 'Manrope', sans-serif; font-size: 11px; color: #999; }
.info-val.gold { color: #c9a962; }

.risk-bars { display: flex; flex-direction: column; gap: 8px; }
.risk-row { display: flex; align-items: center; gap: 7px; }
.risk-label { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; width: 56px; flex-shrink: 0; }
.risk-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.risk-fill { height: 100%; border-radius: 2px; transition: width .5s; }
.risk-val { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 700; min-width: 40px; text-align: right; }

@media (max-width: 1100px) {
  .side-panel { border-left: none; border-top: 1px solid #1e1e1e; }
}
</style>
