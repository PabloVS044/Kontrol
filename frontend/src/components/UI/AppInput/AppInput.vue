<template>
  <div class="app-input-wrap">
    <label v-if="label" class="app-input-label" :for="inputId">
      {{ label }}
      <span v-if="required" class="app-input-req">*</span>
    </label>
    <input
      :id="inputId"
      class="app-input"
      :class="{ 'app-input--error': error }"
      v-bind="$attrs"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="app-input-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label:       { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type:        { type: String, default: 'text' },
  error:       { type: String, default: '' },
  disabled:    { type: Boolean, default: false },
  required:    { type: Boolean, default: false },
  id:          { type: String, default: '' },
})

defineEmits(['update:modelValue'])
defineOptions({ inheritAttrs: false })

const inputId = computed(() => props.id || `app-input-${Math.random().toString(36).slice(2, 7)}`)
</script>

<style scoped>
.app-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.app-input-label {
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--TextMuted, #8a8070);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.app-input-req {
  color: var(--ErrorText, #e05252);
  margin-left: 2px;
}

.app-input {
  background: var(--InputBg, rgba(255,255,255,0.04));
  border: 1px solid var(--Border, #312713);
  color: var(--Text, #ffffff);
  padding: 10px 14px;
  font-size: 14px;
  font-family: 'Manrope', 'DM Sans', sans-serif;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.app-input::placeholder {
  color: var(--TextPlaceholder, #4a4030);
}

.app-input:focus {
  border-color: var(--Primary, #c9a962);
  background: var(--InputFocusBg, rgba(202,168,96,0.05));
}

.app-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.app-input--error {
  border-color: var(--ErrorText, #e05252);
}

.app-input-error {
  font-size: 12px;
  color: var(--ErrorText, #e05252);
  margin: 0;
  font-family: 'Manrope', 'DM Sans', sans-serif;
}
</style>
