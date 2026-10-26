import { readonly, ref } from 'vue'

/**
 * Kontrol — control de tema (SCRUM-13 / HU-32, punto 4 del alcance).
 *
 * Escribe `data-theme` en `<html>`, que es lo que leen los tokens de
 * `src/styles/theme.css`. Preferencia persistida en localStorage.
 *
 * El tema claro es una propuesta pendiente de validación de Diseño.
 */

const STORAGE_KEY = 'kontrol:theme'
const THEMES = ['dark', 'light']
// 'system' no se guarda: es la ausencia de una elección.
const MODES = ['system', ...THEMES]
const DEFAULT_THEME = 'dark'

const current = ref(DEFAULT_THEME)
const mode = ref('system')

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEMES.includes(stored) ? stored : null
  } catch {
    // Safari en modo privado y algunos entornos de test lanzan al tocar
    // localStorage. La preferencia no es crítica: se cae al default.
    return null
  }
}

function persist(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // idem: sin persistencia, el tema sigue aplicándose en la sesión actual.
  }
}

function clearStored() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // idem.
  }
}

function apply(theme) {
  current.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

/** Tema que pide el sistema; oscuro si no pide nada. */
function systemTheme() {
  const prefersLight =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches

  return prefersLight ? 'light' : DEFAULT_THEME
}

export function useTheme() {
  /** Llamar una vez al arrancar la app, antes del primer render. */
  function initTheme() {
    const stored = readStored()
    mode.value = stored ?? 'system'
    apply(stored ?? systemTheme())
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) {
      throw new Error(`Tema desconocido: "${theme}". Válidos: ${THEMES.join(', ')}`)
    }
    mode.value = theme
    apply(theme)
    persist(theme)
  }

  /** 'system' vuelve a seguir al sistema y olvida la elección guardada. */
  function setMode(next) {
    if (next !== 'system') return setTheme(next)
    clearStored()
    mode.value = 'system'
    apply(systemTheme())
  }

  function toggleTheme() {
    setTheme(current.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(current),
    mode: readonly(mode),
    availableThemes: THEMES,
    availableModes: MODES,
    initTheme,
    setTheme,
    setMode,
    toggleTheme,
  }
}
