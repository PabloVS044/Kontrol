import { readonly, ref } from 'vue'

/**
 * Kontrol — control de tema (SCRUM-13 / HU-32, punto 4 del alcance).
 *
 * Escribe `data-theme` en `<html>`, que es lo que leen los tokens de
 * `src/styles/theme.css`. Preferencia persistida en localStorage.
 *
 * Estado actual: SCRUM-12 definió únicamente la identidad "Luxury Dark".
 * El tema claro está declarado pero sin overrides, así que seleccionarlo
 * hereda el oscuro. El mecanismo es funcional; faltan los valores de marca.
 * Ver el TODO(SCRUM-12) en `theme.css`.
 */

const STORAGE_KEY = 'kontrol:theme'
const THEMES = ['dark', 'light']
const DEFAULT_THEME = 'dark'

const current = ref(DEFAULT_THEME)

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

function apply(theme) {
  current.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

/** Resuelve la preferencia: guardada > sistema > default. */
function resolveInitial() {
  const stored = readStored()
  if (stored) return stored

  const prefersLight =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches

  return prefersLight ? 'light' : DEFAULT_THEME
}

export function useTheme() {
  /** Llamar una vez al arrancar la app, antes del primer render. */
  function initTheme() {
    apply(resolveInitial())
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) {
      throw new Error(`Tema desconocido: "${theme}". Válidos: ${THEMES.join(', ')}`)
    }
    apply(theme)
    persist(theme)
  }

  function toggleTheme() {
    setTheme(current.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(current),
    availableThemes: THEMES,
    initTheme,
    setTheme,
    toggleTheme,
  }
}
