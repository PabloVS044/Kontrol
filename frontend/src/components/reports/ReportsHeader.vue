<template>
  <div class="rep-header">
    <div class="rep-header-left">
      <h1 class="rep-title">{{ $t('reports.header.title') }}</h1>
      <p class="rep-subtitle">{{ $t('reports.header.subtitle') }}</p>
    </div>
    <div class="rep-header-actions">
      <button class="btn-outline">
        <Plus :size="14" />
        {{ $t('reports.header.createReport') }}
      </button>
      <button class="btn-outline">
        <BadgeCheck :size="14" />
        {{ $t('reports.header.generateAI') }}
      </button>
      <button class="btn-outline">
        <Download :size="14" />
        {{ $t('reports.header.export') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { BadgeCheck, Download, Plus } from 'lucide-vue-next'
</script>

<style scoped>
.rep-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 28px;
}

.rep-title {
  font-family: 'Playfair Display', serif;
  font-size: 42px;
  font-weight: 400;
  color: #faf8f5;
  margin: 0 0 4px;
}

.rep-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #666;
  margin: 0;
}

.rep-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #111111;
  border: 1px solid #1f1f1f;
  color: #888;
  padding: 9px 12px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  transition: color .2s, border-color .2s;
}

.btn-outline:hover {
  color: #caa860;
  border-color: rgba(202,168,96,0.45);
}

@media (max-width: 640px) {
  .rep-header { flex-direction: column; }
  .rep-header-actions { width: 100%; justify-content: flex-start; }
}
</style>
