import { describe, it, expect, vi } from 'vitest'
import { finalizeAuthenticatedSession, getDefaultAuthenticatedRoute } from '@/utils/authFlow.js'

function fakeAuthStore(overrides = {}) {
  return {
    setToken: vi.fn(),
    setUser: vi.fn(),
    fetchMe: vi.fn().mockResolvedValue(undefined),
    loadEmpresas: vi.fn().mockResolvedValue(undefined),
    selectEmpresaById: vi.fn(),
    loadAccessContext: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('finalizeAuthenticatedSession', () => {
  it('con usuario: lo guarda sin pedir /me y carga empresas y contexto', async () => {
    const store = fakeAuthStore()
    await finalizeAuthenticatedSession({ authStore: store, token: 't1', user: { id_usuario: 1 } })

    expect(store.setToken).toHaveBeenCalledWith('t1')
    expect(store.setUser).toHaveBeenCalledWith({ id_usuario: 1 })
    expect(store.fetchMe).not.toHaveBeenCalled()
    expect(store.loadEmpresas).toHaveBeenCalledOnce()
    expect(store.selectEmpresaById).not.toHaveBeenCalled()
    expect(store.loadAccessContext).toHaveBeenCalledOnce()
  })

  it('sin usuario: pide /me y, si se unió a una empresa, la selecciona', async () => {
    const store = fakeAuthStore()
    await finalizeAuthenticatedSession({ authStore: store, token: 't2', joinedEmpresaId: 5 })

    expect(store.fetchMe).toHaveBeenCalledOnce()
    expect(store.setUser).not.toHaveBeenCalled()
    expect(store.selectEmpresaById).toHaveBeenCalledWith(5)
  })

  it('selecciona la empresa después de cargarlas y antes del contexto de acceso', async () => {
    const order = []
    const store = fakeAuthStore({
      loadEmpresas: vi.fn(async () => order.push('empresas')),
      selectEmpresaById: vi.fn(() => order.push('select')),
      loadAccessContext: vi.fn(async () => order.push('contexto')),
    })
    await finalizeAuthenticatedSession({ authStore: store, token: 't', user: {}, joinedEmpresaId: 2 })
    expect(order).toEqual(['empresas', 'select', 'contexto'])
  })
})

describe('getDefaultAuthenticatedRoute', () => {
  it('super usuario va al panel de administración', () => {
    expect(getDefaultAuthenticatedRoute({ isSuperUser: true, empresaActual: { id: 1 } })).toEqual({
      name: 'admin-dashboard',
    })
  })

  it('con empresa va al dashboard y sin empresa al onboarding', () => {
    expect(getDefaultAuthenticatedRoute({ isSuperUser: false, empresaActual: { id: 1 } })).toEqual({
      name: 'dashboard',
    })
    expect(getDefaultAuthenticatedRoute({ isSuperUser: false, empresaActual: null })).toEqual({
      name: 'onboarding',
    })
  })
})
