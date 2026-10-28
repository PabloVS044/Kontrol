import { ref } from 'vue'
import { acceptLegalDocuments, fetchLegalStatus } from '../services/legal.js'

/**
 * Kontrol — aceptación de los documentos legales (L-6).
 *
 * La constancia vive en el servidor (`aceptacion_legal`): qué versión de cada
 * documento aceptó el usuario, cuándo y desde qué IP. Aquí solo se consulta
 * qué tiene pendiente: los documentos que nunca aceptó —una cuenta creada con
 * Google, que no pasa por la casilla del formulario— y los que cambiaron de
 * forma sustancial desde su última aceptación.
 *
 * Si la consulta falla no se bloquea la plataforma: se vuelve a intentar en la
 * siguiente navegación. El alta con formulario ya deja la constancia sin pasar
 * por aquí.
 */

// Hasta L-6 la aceptación se guardaba solo en este navegador. Ya no prueba
// nada y la política de almacenamiento no la declara: se borra al cargar.
try {
  localStorage.removeItem('kontrol:legal-consent')
} catch {
  // Safari en modo privado y algunos entornos de test lanzan al tocarlo.
}

const userId = ref(null)
const pending = ref([])
const loaded = ref(false)
let inFlight = null

export function useLegalConsent() {
  /** Consulta lo pendiente del usuario; no repite la consulta si ya la tiene. */
  async function load(id, { force = false } = {}) {
    const key = String(id)
    if (!force && loaded.value && userId.value === key) return pending.value
    if (inFlight?.key === key) return inFlight.promise

    const promise = fetchLegalStatus()
      .then((data) => {
        userId.value = key
        pending.value = data.pending ?? []
        loaded.value = true
        return pending.value
      })
      .catch(() => {
        loaded.value = false
        return []
      })
      .finally(() => {
        inFlight = null
      })
    inFlight = { key, promise }
    return promise
  }

  /** Pendientes del usuario dado, o `[]` si todavía no se sabe. */
  function pendingFor(id) {
    return loaded.value && userId.value === String(id) ? pending.value : []
  }

  /**
   * Registra la aceptación. Si los documentos cambiaron mientras el aviso
   * estaba abierto, recarga lo pendiente y lanza para que se vuelva a leer.
   */
  async function accept(id) {
    try {
      await acceptLegalDocuments()
      pending.value = []
    } catch (error) {
      if (error.serverCode === 'legal_version_outdated') await load(id, { force: true })
      throw error
    }
  }

  function reset() {
    userId.value = null
    pending.value = []
    loaded.value = false
  }

  return { load, pendingFor, accept, reset }
}
