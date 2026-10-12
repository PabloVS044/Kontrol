<template>
  <!-- Variante "inline": los dos idiomas a la vista, para Configuración y la
       landing, donde hay sitio y no hace falta un menú que esconda la opción. -->
  <div v-if="variant === 'inline'" class="lang-inline" role="group" :aria-label="$t('language.label')">
    <button
      v-for="option in availableLocales"
      :key="option"
      type="button"
      class="lang-inline-opt"
      :class="{ selected: locale === option }"
      :aria-pressed="locale === option"
      :lang="option"
      @click="setLocale(option)"
    >{{ localeLabels[option] }}</button>
  </div>

  <!-- Variante "menu": para la barra superior, donde solo cabe un control. -->
  <div v-else ref="rootRef" class="lang-picker">
    <button
      type="button"
      class="lang-btn"
      :class="{ active: isOpen }"
      :aria-label="$t('language.change')"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click.stop="isOpen = !isOpen"
    >
      <Languages :size="16" aria-hidden="true" />
      <!-- El icono solo no se leía como "idioma": cinco de cinco participantes
           pasaron de largo y uno tardó 2:30 en encontrarlo. El nombre del
           idioma activo, escrito, es lo que lo vuelve reconocible. -->
      <span class="lang-btn-text" :lang="locale">{{ localeLabels[locale] }}</span>
      <svg class="lang-caret" :class="{ open: isOpen }" width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" />
      </svg>
    </button>

    <div v-if="isOpen" class="lang-dropdown" role="menu">
      <button
        v-for="option in availableLocales"
        :key="option"
        type="button"
        role="menuitem"
        class="lang-opt"
        :class="{ selected: locale === option }"
        :lang="option"
        @click="choose(option)"
      >{{ localeLabels[option] }}</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Languages } from 'lucide-vue-next'
import { useLocale } from '../../composables/useLocale.js'

const props = defineProps({
  variant: { type: String, default: 'menu' },
})

const { locale, availableLocales, localeLabels, setLocale } = useLocale()

const isOpen  = ref(false)
const rootRef = ref(null)

function choose(option) {
  setLocale(option)
  isOpen.value = false
}

function handleClickOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) isOpen.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') isOpen.value = false
}

onMounted(() => {
  if (props.variant === 'menu') {
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.lang-picker {
  position: relative;
  display: flex;
  align-items: center;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: var(--k-border-width) solid transparent;
  padding: 5px 8px;
  cursor: pointer;
  color: var(--k-gray-2);
  transition: color 0.15s, border-color 0.15s;
  border-radius: var(--k-radius-sm);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  line-height: 1;
}

.lang-btn:hover,
.lang-btn.active {
  color: var(--Primary);
  border-color: var(--k-shade-6);
}

.lang-btn:focus-visible {
  outline: 2px solid var(--Primary);
  outline-offset: 2px;
}

.lang-caret { transition: transform 0.15s; }
.lang-caret.open { transform: rotate(180deg); }

.lang-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 130px;
  z-index: 200;
}

.lang-opt {
  background: transparent;
  border: none;
  text-align: left;
  padding: 7px 10px;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-gray-3);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.lang-opt:hover { color: var(--Text); background: rgba(255, 255, 255, 0.04); }
.lang-opt.selected { color: var(--Primary); }

/* ── Variante inline ── */
.lang-inline {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
  border-radius: var(--k-radius-sm);
}

.lang-inline-opt {
  background: transparent;
  border: none;
  padding: 7px 14px;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-gray-3);
  cursor: pointer;
  border-radius: calc(var(--k-radius-sm) - 2px);
  transition: color 0.15s, background 0.15s;
}

.lang-inline-opt:hover { color: var(--Text); background: rgba(255, 255, 255, 0.04); }

.lang-inline-opt.selected {
  color: var(--k-shade-1);
  background: var(--Primary);
}

.lang-inline-opt:focus-visible {
  outline: 2px solid var(--Primary);
  outline-offset: 2px;
}

/* El texto del idioma es lo que vuelve reconocible el control, así que solo
   desaparece cuando la barra ya no tiene sitio para nada más. */
@media (max-width: 420px) {
  .lang-btn-text { display: none; }
}
</style>
