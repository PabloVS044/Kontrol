import { useI18n } from 'vue-i18n'
import { i18n } from '../locales/index.js'
import { onPreferencesAccepted, preferencesAllowed, setPreferenceItem } from './useStorageConsent.js'

/**
 * Kontrol — preferencia de idioma (HU de traducción, bug B-01).
 *
 * El idioma vivía en el navbar de la aplicación: se leía en su `onMounted` y se
 * guardaba con una clave por usuario (`locale_<id>`). Eso dejaba tres agujeros
 * que las pruebas 9 y 10 encontraron:
 *
 *  1. Las pantallas que no montan el navbar —inicio de sesión, crear cuenta,
 *     Configuración, la landing, la invitación— arrancaban siempre en inglés,
 *     porque nadie había leído la preferencia todavía. Recargar Configuración
 *     "perdía" el idioma (B-01).
 *  2. Cerrar sesión borraba al usuario, así que la clave `locale_<id>` ya no se
 *     podía resolver y la app volvía al inglés.
 *  3. La preferencia no se reflejaba en `<html lang>`, que es lo que usan el
 *     lector de pantalla y el corrector del navegador.
 *
 * Ahora la preferencia es del navegador, no de la sesión: se aplica una vez al
 * arrancar (`initLocale()` en `main.js`), antes del primer render, así que
 * cualquier ruta nace en el idioma elegido.
 */

const STORAGE_KEY = 'kontrol:locale'
export const LOCALES = ['en', 'es']
const DEFAULT_LOCALE = 'en'

/** Etiquetas en su propio idioma: "Español" nunca se traduce a "Spanish". */
export const LOCALE_LABELS = {
  en: 'English',
  es: 'Español',
}

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return LOCALES.includes(stored) ? stored : null
  } catch {
    // Safari en modo privado y algunos entornos de test lanzan al tocar
    // localStorage. El idioma no es crítico: se cae al default.
    return null
  }
}

/**
 * Rescata la preferencia guardada con el esquema viejo (`locale_<id>`). Sin
 * esto, quien ya había elegido español volvería al inglés justo al instalar
 * este arreglo.
 */
function readLegacy() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const id = user?.id_usuario
    if (id == null) return null
    const stored = localStorage.getItem(`locale_${id}`)
    return LOCALES.includes(stored) ? stored : null
  } catch {
    return null
  }
}

// Sin consentimiento para preferencias (L-3), o sin almacenamiento, el idioma
// sigue aplicándose en esta pestaña pero no se guarda.
function persist(locale) {
  setPreferenceItem(STORAGE_KEY, locale)
}

// Idioma elegido a mano antes de responder al aviso de almacenamiento, por
// ejemplo en la portada. Si después acepta, se guarda sin pedirle que lo
// vuelva a elegir. El idioma deducido del navegador no cuenta como elección.
let chosenBeforeConsent = null
onPreferencesAccepted(() => {
  if (chosenBeforeConsent) persist(chosenBeforeConsent)
  chosenBeforeConsent = null
})

/**
 * `lang` manda en la pronunciación del lector de pantalla, la separación de
 * palabras y el idioma que asume el corrector ortográfico de los campos.
 */
function applyHtmlLang(locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale)
  }
}

/** Resuelve la preferencia: guardada > clave antigua > navegador > default. */
export function resolveInitialLocale() {
  const stored = readStored()
  if (stored) return stored

  const legacy = readLegacy()
  if (legacy) {
    // Se migra al vuelo para que la siguiente carga no dependa de la sesión.
    persist(legacy)
    return legacy
  }

  // Sin preferencia explícita, el idioma del navegador es la mejor apuesta:
  // un navegador en español no debería estrenar la app en inglés.
  const preferred = typeof navigator !== 'undefined'
    ? String(navigator.language || '').slice(0, 2).toLowerCase()
    : ''

  return LOCALES.includes(preferred) ? preferred : DEFAULT_LOCALE
}

/**
 * Llamar una vez al arrancar la app, antes del primer render. Vive fuera del
 * composable porque `main.js` no está dentro de un componente y `useI18n()`
 * exige contexto de componente.
 */
export function initLocale() {
  const locale = resolveInitialLocale()
  i18n.global.locale.value = locale
  applyHtmlLang(locale)
}

export function useLocale() {
  // Se toma la instancia del `app` actual en vez del singleton importado: así
  // los tests pueden montar un componente con su propio `createI18n`.
  const { locale } = useI18n()

  function setLocale(next) {
    if (!LOCALES.includes(next)) {
      throw new Error(`Idioma desconocido: "${next}". Válidos: ${LOCALES.join(', ')}`)
    }
    locale.value = next
    applyHtmlLang(next)
    if (!preferencesAllowed()) chosenBeforeConsent = next
    persist(next)
  }

  function toggleLocale() {
    setLocale(locale.value === 'es' ? 'en' : 'es')
  }

  return {
    locale,
    availableLocales: LOCALES,
    localeLabels: LOCALE_LABELS,
    setLocale,
    toggleLocale,
  }
}
