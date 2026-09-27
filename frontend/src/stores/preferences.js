import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

/**
 * Preferencias de visualización de CADA usuario.
 *
 * No viven en `empresa_config` a propósito: esa la edita solo el dueño y se
 * aplica a toda la empresa, y esconder un ayudante flotante es una decisión de
 * quien mira la pantalla, no una política. Se guardan por usuario en el propio
 * navegador, así que dos personas en el mismo equipo pueden decidir distinto.
 */
const KEY = (idUsuario) => `prefs_${idUsuario ?? 'anon'}`

function read(idUsuario) {
  try {
    return JSON.parse(localStorage.getItem(KEY(idUsuario)) || '{}')
  } catch {
    // Un valor corrupto no debe tumbar el arranque de la app.
    return {}
  }
}

export const usePreferencesStore = defineStore('preferences', {
  state: () => ({
    // Visible por defecto: quien no ha tocado nada espera la app como estaba.
    birdieVisible: true,
    loadedFor: null,
  }),

  actions: {
    /** Carga las preferencias del usuario activo. Idempotente. */
    load() {
      const auth = useAuthStore()
      const id = auth.idUsuario
      if (this.loadedFor === id) return
      const saved = read(id)
      this.birdieVisible = saved.birdieVisible !== false
      this.loadedFor = id
    },

    setBirdieVisible(visible) {
      this.birdieVisible = visible !== false
      this.persist()
    },

    persist() {
      const auth = useAuthStore()
      try {
        localStorage.setItem(
          KEY(auth.idUsuario),
          JSON.stringify({ birdieVisible: this.birdieVisible })
        )
      } catch {
        // Modo privado o almacenamiento lleno: la preferencia dura la sesión.
      }
    },
  },
})
