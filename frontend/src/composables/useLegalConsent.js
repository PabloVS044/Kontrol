import { ref } from 'vue'
import { LEGAL_VERSION } from '../utils/legal.js'

/**
 * Kontrol — aceptación de los Términos y Condiciones.
 *
 * La aceptación vive solo en el navegador: se guarda la versión y los usuarios
 * que la aceptaron en este equipo, sin registrarlo en el servidor. Un usuario
 * nuevo en el mismo navegador —una caja compartida, por ejemplo— ve el aviso
 * aunque otro ya lo haya aceptado, y subir LEGAL_VERSION se lo vuelve a pedir
 * a todos.
 */

const STORAGE_KEY = 'kontrol:legal-consent'

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (stored?.version !== LEGAL_VERSION || !Array.isArray(stored.users)) return []
    return stored.users
  } catch {
    // Safari en modo privado y algunos entornos de test lanzan al tocar
    // localStorage: se trata como no aceptado y el aviso se vuelve a pedir.
    return []
  }
}

const acceptedUsers = ref(readStored())

export function useLegalConsent() {
  function hasAccepted(userId) {
    return acceptedUsers.value.includes(String(userId))
  }

  function accept(userId) {
    if (hasAccepted(userId)) return
    acceptedUsers.value = [...acceptedUsers.value, String(userId)]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: LEGAL_VERSION, users: acceptedUsers.value }))
    } catch {
      // idem: la aceptación vale para esta pestaña aunque no se pueda guardar.
    }
  }

  return { hasAccepted, accept }
}
