import { readonly, ref } from 'vue'
import { onPreferencesAccepted, setPreferenceItem } from './useStorageConsent.js'

/**
 * Kontrol — tamaño de letra (Configuración > Preferencias).
 *
 * Escribe `data-font-scale` en `<html>`, y `globals.css` lo traduce a un
 * `font-size` en porcentaje. Todos los tamaños de letra del proyecto están en
 * rem, así que crece el texto y no el resto de la maquetación, que va en px:
 * no es un zoom, los anchos y los breakpoints siguen siendo los mismos.
 *
 * Solo se aplica dentro de la aplicación (rutas con `meta.surface`). La
 * landing, el inicio de sesión y el registro tienen tipografía fluida propia y
 * su maquetación cuenta con ella; App.vue enciende y apaga el ámbito al navegar.
 *
 * Como el tema y el idioma, la preferencia es del navegador, no de la sesión,
 * y solo se guarda si el usuario aceptó el almacenamiento de preferencias.
 */

const STORAGE_KEY = 'kontrol:font-scale'
// El primero es la ausencia de elección: no se guarda.
export const FONT_SCALES = ['default', 'large', 'larger', 'largest']
const DEFAULT_SCALE = FONT_SCALES[0]

const current = ref(DEFAULT_SCALE)
const active = ref(true)

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return FONT_SCALES.includes(stored) ? stored : null
  } catch {
    // Safari en modo privado y algunos entornos de test lanzan al tocar
    // localStorage. Se cae al tamaño por defecto.
    return null
  }
}

function persist(scale) {
  if (scale !== DEFAULT_SCALE) {
    setPreferenceItem(STORAGE_KEY, scale)
    return
  }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // idem.
  }
}

// Si elige el tamaño antes de responder al aviso de almacenamiento y luego
// acepta, se guarda sin tener que volver a elegirlo.
onPreferencesAccepted(() => {
  if (current.value !== DEFAULT_SCALE) persist(current.value)
})

function apply() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (active.value && current.value !== DEFAULT_SCALE) {
    root.setAttribute('data-font-scale', current.value)
  } else {
    root.removeAttribute('data-font-scale')
  }
}

export function useFontScale() {
  /** Llamar una vez al arrancar la app, antes del primer render. */
  function initFontScale() {
    current.value = readStored() ?? DEFAULT_SCALE
    apply()
  }

  function setFontScale(scale) {
    if (!FONT_SCALES.includes(scale)) {
      throw new Error(`Tamaño de letra desconocido: "${scale}". Válidos: ${FONT_SCALES.join(', ')}`)
    }
    current.value = scale
    apply()
    persist(scale)
  }

  /** Enciende o apaga el ámbito sin olvidar la elección. */
  function setFontScaleActive(on) {
    active.value = Boolean(on)
    apply()
  }

  return {
    fontScale: readonly(current),
    availableScales: FONT_SCALES,
    initFontScale,
    setFontScale,
    setFontScaleActive,
  }
}
