import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'

describe('auth store (Pinia)', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('inicia sin sesión y isLoggedIn refleja el token', () => {
    const store = useAuthStore()
    expect(store.isLoggedIn).toBe(false)

    store.setToken('jwt-de-prueba')
    expect(store.isLoggedIn).toBe(true)
    expect(localStorage.getItem('token')).toBe('jwt-de-prueba')
  })

  it('setUser persiste el usuario y alimenta los getters', () => {
    const store = useAuthStore()
    store.setUser({ id_usuario: 7, nombre_rol: 'super_user' })

    expect(store.idUsuario).toBe(7)
    expect(store.isSuperUser).toBe(true)
    expect(JSON.parse(localStorage.getItem('user')).id_usuario).toBe(7)
  })

  it('selectEmpresaById selecciona por id numérico o string y resetea accessContext', () => {
    const store = useAuthStore()
    store.setEmpresas([
      { id_empresa: 1, nombre: 'Alfa' },
      { id_empresa: 2, nombre: 'Beta' },
    ])
    store.setAccessContext({ capabilities: { can_manage_users: true } })

    const empresa = store.selectEmpresaById('2')

    expect(empresa.nombre).toBe('Beta')
    expect(store.idEmpresaActual).toBe(2)
    expect(store.accessContext).toBeNull()
  })

  it('selectEmpresaById devuelve null si la empresa no existe y no cambia la actual', () => {
    const store = useAuthStore()
    store.setEmpresas([{ id_empresa: 1, nombre: 'Alfa' }])
    store.setEmpresaActual({ id_empresa: 1, nombre: 'Alfa' })

    expect(store.selectEmpresaById(99)).toBeNull()
    expect(store.idEmpresaActual).toBe(1)
  })

  it('canManageTeams depende del rol en la empresa actual', () => {
    const store = useAuthStore()

    store.setEmpresaActual({ id_empresa: 1, rol: 'manager' })
    expect(store.canManageTeams).toBe(true)

    store.setEmpresaActual({ id_empresa: 1, rol: 'viewer' })
    expect(store.canManageTeams).toBe(false)
  })

  it('loadEmpresas consume la API y auto-selecciona la primera empresa', async () => {
    const empresas = [{ id_empresa: 5, nombre: 'Gamma' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: empresas }),
    }))

    const store = useAuthStore()
    store.setToken('jwt-de-prueba')
    await store.loadEmpresas()

    expect(fetch).toHaveBeenCalledWith('/api/companies/my-companies', {
      headers: { Authorization: 'Bearer jwt-de-prueba' },
    })
    expect(store.empresas).toEqual(empresas)
    expect(store.idEmpresaActual).toBe(5)
  })

  it('logout limpia estado y localStorage por completo', () => {
    const store = useAuthStore()
    store.setToken('jwt')
    store.setUser({ id_usuario: 1 })
    store.setEmpresas([{ id_empresa: 1 }])

    store.logout()

    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
    expect(store.empresas).toEqual([])
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
