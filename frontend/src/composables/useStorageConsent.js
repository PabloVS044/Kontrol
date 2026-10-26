import { readonly, ref } from 'vue'

/**
 * Kontrol — consentimiento para el almacenamiento no imprescindible (L-3).
 *
 * Lo imprescindible (sesión, empresa activa, aceptación de los Términos y esta
 * misma decisión) se guarda siempre. Las preferencias de interfaz solo se
 * escriben en el navegador si el usuario lo acepta. Mientras no decide, o si
 * rechaza, se aplican en la pestaña pero no se guardan.
 *
 * La decisión vive en este navegador y no en el servidor: el aviso aparece
 * también a quien visita la portada sin cuenta.
 *
 * Inventario y política: docs/legal/inventario-almacenamiento-navegador.md y
 * docs/legal/politica-cookies.md. Una clave nueva de preferencias tiene que
 * añadirse a PREFERENCE_KEYS (o PREFERENCE_PREFIXES) y a esos documentos.
 */

export const CONSENT_KEY = 'kontrol:storage-consent'

// Subirla vuelve a mostrar el aviso a todos, por ejemplo al añadir una
// categoría nueva de almacenamiento no imprescindible.
export const CONSENT_VERSION = 1

export const PREFERENCE_KEYS = Object.freeze([
  'kontrol:locale',
  'kontrol:theme',
  'projects-view-mode',
  'birdie-fab-position',
  'birdie-assistant-home',
])

// `prefs_<id>` (asistente visible) y `locale_<id>` (idioma, esquema anterior).
export const PREFERENCE_PREFIXES = Object.freeze(['prefs_', 'locale_'])

function getStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // Algunos navegadores lanzan solo por acceder a `localStorage` cuando el
    // usuario bloquea los datos del sitio.
    return null
  }
}

/** 'accepted' | 'rejected' | null (sin decidir o versión antigua). */
function readStoredDecision() {
  try {
    const stored = JSON.parse(getStorage()?.getItem(CONSENT_KEY) || 'null')
    if (stored?.version !== CONSENT_VERSION) return null
    if (stored.preferences === true) return 'accepted'
    if (stored.preferences === false) return 'rejected'
    return null
  } catch {
    return null
  }
}

const decision = ref(readStoredDecision())
const panelOpen = ref(false)
const acceptListeners = new Set()

/**
 * Se lee del almacenamiento en cada llamada, no del estado en memoria: si la
 * decisión no se pudo guardar, tampoco se debe guardar ninguna preferencia.
 */
export function preferencesAllowed() {
  return readStoredDecision() === 'accepted'
}

/** Guarda una preferencia solo si el usuario lo aceptó. Devuelve si se guardó. */
export function setPreferenceItem(key, value) {
  if (!preferencesAllowed()) return false
  try {
    getStorage()?.setItem(key, value)
    return true
  } catch {
    // Modo privado o almacenamiento lleno: la preferencia dura la pestaña.
    return false
  }
}

/** Leer no escribe nada, así que no depende del consentimiento. */
export function getPreferenceItem(key) {
  try {
    return getStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

function isPreferenceKey(key) {
  return PREFERENCE_KEYS.includes(key) || PREFERENCE_PREFIXES.some((prefix) => key.startsWith(prefix))
}

/** Borra del navegador todas las preferencias guardadas. */
export function clearPreferenceItems() {
  const storage = getStorage()
  if (!storage) return
  try {
    const keys = new Set(PREFERENCE_KEYS)
    if (typeof storage.length === 'number' && typeof storage.key === 'function') {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && isPreferenceKey(key)) keys.add(key)
      }
    }
    keys.forEach((key) => storage.removeItem(key))
  } catch {
    // Si no se puede borrar, tampoco se pudo escribir antes.
  }
}

function storeDecision(preferences) {
  try {
    getStorage()?.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION, preferences, decidedAt: new Date().toISOString() }),
    )
  } catch {
    // La decisión vale para esta pestaña aunque no se pueda guardar; el aviso
    // volverá a salir en la próxima carga.
  }
}

/**
 * Registra una función que se ejecuta al aceptar, para guardar lo que el
 * usuario eligió antes de decidir (por ejemplo, el idioma en la portada).
 * Devuelve la función para darla de baja.
 */
export function onPreferencesAccepted(callback) {
  acceptListeners.add(callback)
  return () => acceptListeners.delete(callback)
}

export function acceptPreferences() {
  storeDecision(true)
  decision.value = 'accepted'
  panelOpen.value = false
  acceptListeners.forEach((callback) => {
    try {
      callback()
    } catch {
      // Una preferencia que no se pudo guardar no deshace la decisión.
    }
  })
}

export function rejectPreferences() {
  storeDecision(false)
  clearPreferenceItems()
  decision.value = 'rejected'
  panelOpen.value = false
}

export function useStorageConsent() {
  return {
    decision: readonly(decision),
    panelOpen: readonly(panelOpen),
    accept: acceptPreferences,
    reject: rejectPreferences,
    openPanel: () => {
      panelOpen.value = true
    },
    closePanel: () => {
      panelOpen.value = false
    },
  }
}
