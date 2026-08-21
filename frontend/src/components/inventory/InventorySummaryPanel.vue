<template>
  <aside class="context-panel">
    
    <!-- Header -->
    <div>
      <div class="ctx-title">Summary</div>
      <div class="ctx-subtitle">
        {{ selectedProject ? selectedProject.nombre : 'All projects' }}
      </div>
    </div>

    <!-- Stats grid -->
    <div>
      <p class="ctx-label">At a Glance</p>
      <div class="summary-grid">
        <div class="summary-card">
          <span class="s-value">{{ stats.total }}</span>
          <span class="s-label">Total products</span>
        </div>
        <div class="summary-card">
          <span class="s-value" :style="{ color: lowStockColor }">{{ stats.lowStock }}</span>
          <span class="s-label">Low stock</span>
          <span class="s-sub gold">Reorder soon</span>
        </div>
        <div class="summary-card">
          <span class="s-value" style="color:#fb7185">{{ stats.outOfStock }}</span>
          <span class="s-label">Out of stock</span>
          <span class="s-sub red">Action needed</span>
        </div>
        <div class="summary-card">
          <span class="s-value">${{ stats.totalValue }}</span>
          <span class="s-label">Total value</span>
        </div>
      </div>
    </div>

    <!-- Category breakdown (conditional) -->
    <div v-if="categoryStats.length" class="category-section">
      <p class="ctx-label">By Category</p>
      <div 
        v-for="cat in categoryStats" 
        :key="cat.name" 
        class="cat-breakdown"
      >
        <div class="cat-row">
          <span class="cat-name">{{ cat.name }}</span>
          <span class="cat-count">{{ cat.count }}</span>
        </div>
        <div class="cat-bar-bg">
          <div 
            class="cat-bar-fill" 
            :style="{ width: cat.pct + '%', background: cat.color }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Stock alerts (conditional) -->
    <div v-if="stockAlerts.length" class="alerts-section">
      <p class="ctx-label">Stock Alerts</p>
      <div 
        v-for="alert in stockAlerts" 
        :key="alert.id_producto" 
        class="alert-card"
      >
        <span class="alert-name">{{ alert.nombre }}</span>
        <span class="alert-code">{{ alert.categoria }} · {{ alert.stock_actual }} units left</span>
        <span 
          class="alert-status" 
          :class="alert.stock_actual === 0 ? 'red' : 'gold'"
        >
          {{ alert.stock_actual === 0 ? 'Out of stock' : 'Low stock — reorder soon' }}
        </span>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="actions-section">
      <p class="ctx-label">Quick Actions</p>
      <Button 
        v-if="canCreateProduct" 
        label="+ Add product" 
        @click="$emit('add-product')"
      />
      <Button label="↓ Export inventory" @click="$emit('export')" />
    </div>

    <!-- Data source -->
    <div class="data-source">
      <div class="ds-label">Data Source</div>
      <div class="ds-text">Inventory database · Live</div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import Button from '../UI/Button/Button.vue'

const props = defineProps({
  stats: Object,
  categoryStats: Array,
  stockAlerts: Array,
  selectedProject: Object,
  canCreateProduct: Boolean
})

defineEmits(['add-product', 'export'])

const lowStockColor = computed(() => {
  return props.stats.lowStock > 0 ? '#caa860' : '#555'
})

</script>

<style scoped>
.context-panel {
  width: 320px;
  flex: none;
  background: #0a0a0a;
  border-left: 1px solid #1a1a1a;
  padding: 48px 28px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ctx-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  color: var(--Text);
}
.ctx-subtitle {
  font-size: 13px;
  color: var(--TextFaint);
  margin-top: 4px;
}

.ctx-label {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--TextFaint);
  margin-bottom: 12px;
  font-family: 'Manrope', sans-serif;
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
  color: var(--Text);
  line-height: 1;
}
.s-label {
  font-size: 11px;
  color: var(--TextFaint);
}
.s-sub {
  font-size: 11px;
  color: var(--TextFaint);
}
.s-sub.gold { color: var(--Primary); }
.s-sub.red { color: #fb7185; }

.category-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cat-breakdown {
  gap: 6px;
}
.cat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.cat-name {
  color: var(--Text);
  font-weight: 500;
}
.cat-count {
  color: var(--TextMuted);
}
.cat-bar-bg {
  height: 4px;
  background: #1f1f1f;
  border-radius: 2px;
  overflow: hidden;
}
.cat-bar-fill {
  height: 100%;
  transition: width 0.3s;
  border-radius: 2px;
}

.alerts-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.alert-card {
  padding: 12px;
  background: #111111;
  border: 1px solid rgba(251,113,133,0.2);
  border-radius: 4px;
}
.alert-name {
  font-weight: 600;
  color: var(--Text);
  display: block;
}
.alert-code {
  font-size: 11px;
  color: #fecdd3;
  display: block;
  margin-bottom: 4px;
}
.alert-status {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 3px;
}
.alert-status.red {
  background: rgba(251,113,133,0.15);
  color: #fb7185;
}
.alert-status.gold {
  background: rgba(202,168,96,0.15);
  color: var(--Primary);
}

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
  background: #caa860;
  color: var(--BtnText);
}
:deep(.btn):last-of-type {
  background: #111111;
  border: 1px solid #1f1f1f;
  color: var(--Text);
}

.data-source {
  margin-top: auto;
}
.ds-label {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: #333;
  margin-bottom: 4px;
}
.ds-text {
  font-size: 11px;
  color: var(--TextFaint);
}
</style>

