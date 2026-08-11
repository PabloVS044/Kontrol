<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal" :style="maxWidth ? { maxWidth } : {}">
        <div class="modal-header">
          <slot name="header-prefix" />
          <slot name="header-title">
            <span class="modal-title">{{ title }}</span>
          </slot>
          <slot name="header-actions" />
          <button class="modal-close" @click="close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
            </svg>
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, required: true },
  title:      { type: String, default: '' },
  maxWidth:   { type: String, default: '480px' },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--Background);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--Background2);
  border: 1px solid var(--Border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  transition: var(--transition-ui);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--Border);
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-xl); 
  color: var(--Text);
  flex: 1;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1);
  flex-shrink: 0;
}

.modal-close path {
  stroke: var(--TextMuted);
}
</style>
