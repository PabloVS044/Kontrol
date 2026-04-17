import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token:         localStorage.getItem('token') || null,
    user:          JSON.parse(localStorage.getItem('user') || 'null'),
    empresas:      JSON.parse(localStorage.getItem('empresas') || '[]'),
    empresaActual: JSON.parse(localStorage.getItem('empresaActual') || 'null'),
  }),

  getters: {
    isLoggedIn:      (state) => !!state.token,
    idUsuario:       (state) => state.user?.id_usuario ?? null,
    nombreRol:       (state) => state.user?.nombre_rol  ?? null,
    idEmpresaActual: (state) => state.empresaActual?.id_empresa ?? null,
    hasEmpresa:      (state) => state.empresas.length > 0,
    // Legacy alias kept for any remaining references
    idEmpresa:       (state) => state.empresaActual?.id_empresa ?? null,
  },

  actions: {
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },

    setUser(user) {
      this.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },

    setEmpresaActual(empresa) {
      this.empresaActual = empresa
      localStorage.setItem('empresaActual', JSON.stringify(empresa))
    },

    /**
     * Fetch the user's empresas from the API.
     * Auto-selects the first one if none is currently selected or the selected one
     * no longer exists in the list.
     */
    async loadEmpresas() {
      if (!this.token) return
      try {
        const res = await fetch('/api/empresas/mis-empresas', {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        if (!res.ok) return
        const { data } = await res.json()
        this.empresas = data
        localStorage.setItem('empresas', JSON.stringify(data))

        if (data.length > 0) {
          const stillExists = this.empresaActual &&
            data.some(e => e.id_empresa === this.empresaActual.id_empresa)
          if (!stillExists) {
            this.setEmpresaActual(data[0])
          }
        } else {
          this.setEmpresaActual(null)
        }
      } catch {
        // silently ignore — caller can check hasEmpresa / empresaActual
      }
    },

    async fetchMe() {
      if (!this.token) return
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        if (!res.ok) return
        const { data } = await res.json()
        this.setUser(data)
      } catch {
        // silently ignore
      }
    },

    logout() {
      this.token         = null
      this.user          = null
      this.empresas      = []
      this.empresaActual = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('empresas')
      localStorage.removeItem('empresaActual')
    },
  },
})
