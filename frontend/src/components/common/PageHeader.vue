<template>
  <div class="page-header">
    <div class="header-left">
      <h1 class="header-title">{{ title }}</h1>
      <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
    </div>
    <div class="header-actions">
      <slot />
      <button
        v-if="showCreateButton"
        class="create-btn"
        :disabled="!canCreate"
        @click="$emit('create')"
      >
        {{ createLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  canCreate: { type: Boolean, default: false },
  createLabel: { type: String, default: '+ New' },
  showCreateButton: { type: Boolean, default: false },
})

defineEmits(['create'])
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.header-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 400;
  color: var(--Text);
  margin: 0;
  line-height: 1.1;
}
.header-subtitle {
  font-size: 14px;
  color: var(--TextMuted);
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #caa860;
  border: none;
  color: var(--BtnText);
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  padding: 10px 18px;
  white-space: nowrap;
}

.create-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>

