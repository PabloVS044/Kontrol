import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user:  JSON.parse(localStorage.getItem('user') || 'null'),
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    idUsuario:  (state) => state.user?.id_usuario ?? null,
    idEmpresa:  (state) => state.user?.id_empresa  ?? null,
    nombreRol:  (state) => state.user?.nombre_rol  ?? null,
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
        // silently ignore — user data will be null
      }
    },

    logout() {
      this.token = null
      this.user  = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})
