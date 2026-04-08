import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null,
  }),

  getters: {
    isLoggedIn:  (state) => !!state.token,
    idUsuario:   (state) => state.user?.id_usuario  ?? null,
    idEmpresa:   (state) => state.user?.id_empresa  ?? null,
  },

  actions: {
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },

    logout() {
      this.token = null
      this.user  = null
      localStorage.removeItem('token')
    },

    async fetchMe() {
      if (!this.token) return
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        if (!res.ok) {
          if (res.status === 401) this.logout()
          return
        }
        const data = await res.json()
        this.user = data.data
      } catch {
        // network error — keep existing state
      }
    },
  },
})
