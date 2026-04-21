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
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}

.modal {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  width: 100%; max-height: 90vh; overflow-y: auto;
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px;
  padding: 20px 24px; border-bottom: 1px solid #1a1a1a;
}

.modal-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px; color: #faf8f5;
  flex: 1;
}

.modal-close {
  background: none; border: none; cursor: pointer; padding: 4px;
  flex-shrink: 0;
}
</style>
