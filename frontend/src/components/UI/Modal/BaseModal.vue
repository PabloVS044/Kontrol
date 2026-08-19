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
  z-index: var(--k-z-modal-overlay);
  background: rgba(var(--k-color-black-rgb), 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--Background2);
  border: var(--k-border-width) solid var(--Border);
  border-radius: var(--k-radius-lg);
  box-shadow: var(--k-shadow-modal);
  width: 95%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: var(--k-transition-ui);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--k-space-3);
  padding: var(--k-space-5) var(--k-space-6);
  border-bottom: var(--k-border-width) solid var(--Border);
}

.modal-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1); 
  color: var(--Text);
  flex: 1;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--k-space-1);
  flex-shrink: 0;
}

.modal-close path {
  stroke: var(--TextMuted);
}
</style>
