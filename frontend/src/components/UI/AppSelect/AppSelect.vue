<template>
  <div class="app-select-wrap">
    <label v-if="label" class="app-select-label" :for="selectId">
      {{ label }}
      <span v-if="required" class="app-select-req">*</span>
    </label>
    <div class="app-select-inner">
      <select
        :id="selectId"
        class="app-select"
        :class="{ 'app-select--error': error }"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled :selected="!modelValue">{{ placeholder }}</option>
        <option
          v-for="opt in normalizedOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <!-- Chevron icon -->
      <svg class="app-select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      </svg>
    </div>
    <p v-if="error" class="app-select-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label:      { type: String, default: '' },
  placeholder:{ type: String, default: '' },
  /**
   * options can be:
   *   - array of strings:            ['admin', 'manager']
   *   - array of { value, label }:   [{ value: 'admin', label: 'Admin' }]
   */
  options:    { type: Array, default: () => [] },
  error:      { type: String, default: '' },
  disabled:   { type: Boolean, default: false },
  required:   { type: Boolean, default: false },
  id:         { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const selectId = computed(() => props.id || `app-select-${Math.random().toString(36).slice(2, 7)}`)

const normalizedOptions = computed(() =>
  props.options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )
)
</script>

<style scoped>
.app-select-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.app-select-label {
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--TextMuted, #8a8070);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.app-select-req {
  color: var(--ErrorText, #e05252);
  margin-left: 2px;
}

.app-select-inner {
  position: relative;
  display: flex;
  align-items: center;
}

.app-select {
  appearance: none;
  -webkit-appearance: none;
  background: var(--InputBg, rgba(255,255,255,0.04));
  border: 1px solid var(--Border, #312713);
  color: var(--Text, #ffffff);
  padding: 10px 36px 10px 14px;
  font-size: 14px;
  font-family: 'Manrope', 'DM Sans', sans-serif;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.app-select option {
  background: var(--Background2, #120f07);
  color: var(--Text, #ffffff);
}

.app-select:focus {
  border-color: var(--Primary, #c9a962);
  background: var(--InputFocusBg, rgba(202,168,96,0.05));
}

.app-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.app-select--error {
  border-color: var(--ErrorText, #e05252);
}

.app-select-chevron {
  position: absolute;
  right: 12px;
  color: var(--TextMuted, #8a8070);
  pointer-events: none;
  flex-shrink: 0;
}

.app-select-error {
  font-size: 12px;
  color: var(--ErrorText, #e05252);
  margin: 0;
  font-family: 'Manrope', 'DM Sans', sans-serif;
}
</style>
