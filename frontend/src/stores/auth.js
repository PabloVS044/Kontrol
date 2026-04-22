import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token:         localStorage.getItem('token') || null,
    user:          JSON.parse(localStorage.getItem('user') || 'null'),
    empresas:      JSON.parse(localStorage.getItem('empresas') || '[]'),
    empresaActual: JSON.parse(localStorage.getItem('empresaActual') || 'null'),
    accessContext: JSON.parse(localStorage.getItem('accessContext') || 'null'),
  }),

  getters: {
    isLoggedIn:      (state) => !!state.token,
    idUsuario:       (state) => state.user?.id_usuario ?? null,
    nombreRol:       (state) => state.user?.nombre_rol  ?? null,
    idEmpresaActual: (state) => state.empresaActual?.id_empresa ?? null,
    hasEmpresa:      (state) => state.empresas.length > 0,
    canManageUsers:  (state) => state.accessContext?.capabilities?.can_manage_users === true,
    canViewProjects: (state) => state.accessContext?.capabilities?.can_view_projects === true,
    canCreateProjects: (state) => state.accessContext?.capabilities?.can_create_projects === true,
    canViewInventory: (state) => state.accessContext?.capabilities?.can_view_inventory === true,
    canManageInventory: (state) => state.accessContext?.capabilities?.can_manage_inventory === true,
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

    setEmpresas(empresas) {
      this.empresas = empresas
      localStorage.setItem('empresas', JSON.stringify(empresas))
    },

    setAccessContext(context) {
      this.accessContext = context
      if (context) {
        localStorage.setItem('accessContext', JSON.stringify(context))
      } else {
        localStorage.removeItem('accessContext')
      }
    },

    setEmpresaActual(empresa) {
      this.empresaActual = empresa
      this.setAccessContext(null)
      if (empresa) {
        localStorage.setItem('empresaActual', JSON.stringify(empresa))
      } else {
        localStorage.removeItem('empresaActual')
      }
    },

    selectEmpresaById(idEmpresa) {
      const empresa = this.empresas.find(({ id_empresa }) => id_empresa === Number(idEmpresa)) || null
      if (empresa) {
        this.setEmpresaActual(empresa)
      }
      return empresa
    },

    /**
     * Fetch the user's empresas from the API.
     * Auto-selects the first one if none is currently selected or the selected one
     * no longer exists in the list.
     */
    async loadEmpresas() {
      if (!this.token) return
      try {
        const res = await fetch('/api/companies/my-companies', {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        if (!res.ok) return
        const { data } = await res.json()
        this.setEmpresas(data)

        if (data.length > 0) {
          const stillExists = this.empresaActual &&
            data.some(e => e.id_empresa === this.empresaActual.id_empresa)
          if (!stillExists) {
            this.setEmpresaActual(data[0])
          }
        } else {
          this.setEmpresaActual(null)
        }

        await this.loadAccessContext()
      } catch {
        // silently ignore — caller can check hasEmpresa / empresaActual
      }
    },

    async loadAccessContext() {
      if (!this.token || !this.empresaActual?.id_empresa) {
        this.setAccessContext(null)
        return
      }

      try {
        const res = await fetch('/api/companies/access-context', {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'X-Company-ID': this.empresaActual.id_empresa,
          },
        })

        if (!res.ok) {
          this.setAccessContext(null)
          return
        }

        const { data } = await res.json()
        this.setAccessContext(data)
      } catch {
        this.setAccessContext(null)
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
      this.accessContext = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('empresas')
      localStorage.removeItem('empresaActual')
      localStorage.removeItem('accessContext')
    },
  },
})
