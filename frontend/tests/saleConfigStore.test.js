import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSaleConfigStore } from '@/stores/saleConfig.js'
import { useAuthStore } from '@/stores/auth.js'
import { useBirdieStore } from '@/stores/birdie.js'

function okResponse(data) {
  return { ok: true, status: 200, json: () => Promise.resolve({ data }) }
}

describe('saleConfig store', () => {
  let auth

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    auth = useAuthStore()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function selectCompany(id) {
    auth.empresaActual = { id_empresa: id, nombre: `Empresa ${id}` }
  }

  it('arranca con la configuración por defecto y moneda USD', () => {
    const store = useSaleConfigStore()
    expect(store.moneda).toBe('USD')
    expect(store.loadedFor).toBeNull()
    expect(store.config.iva_activo).toBe(false)
  })

  it('sin empresa seleccionada no pide nada', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await useSaleConfigStore().load()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('carga la configuración de la empresa con sus cabeceras y la cachea', async () => {
    selectCompany(3)
    auth.token = 'jwt'
    const fetchMock = vi.fn(() => Promise.resolve(okResponse({ moneda: 'GTQ', iva_activo: true, iva_tasa: 12 })))
    vi.stubGlobal('fetch', fetchMock)

    const store = useSaleConfigStore()
    await store.load()
    await store.load()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/companies/sale-config', {
      headers: { 'X-Company-ID': '3', Authorization: 'Bearer jwt' },
    })
    expect(store.moneda).toBe('GTQ')
    expect(store.config).toMatchObject({ iva_activo: true, iva_tasa: 12, descuento_activo: false })
    expect(store.loadedFor).toBe(3)
    expect(store.loading).toBe(false)
  })

  it('sin token no manda Authorization', async () => {
    selectCompany(1)
    const fetchMock = vi.fn(() => Promise.resolve(okResponse({})))
    vi.stubGlobal('fetch', fetchMock)
    await useSaleConfigStore().load()
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'X-Company-ID': '1' })
  })

  it('force recarga aunque ya esté cargada, y cambiar de empresa invalida la caché', async () => {
    selectCompany(1)
    const fetchMock = vi.fn(() => Promise.resolve(okResponse({})))
    vi.stubGlobal('fetch', fetchMock)
    const store = useSaleConfigStore()

    await store.load()
    await store.load({ force: true })
    selectCompany(2)
    await store.load()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(store.loadedFor).toBe(2)
  })

  it('no lanza peticiones simultáneas mientras una está en curso', async () => {
    selectCompany(1)
    let resolve
    const fetchMock = vi.fn(() => new Promise((r) => { resolve = r }))
    vi.stubGlobal('fetch', fetchMock)
    const store = useSaleConfigStore()

    const first = store.load()
    await store.load({ force: true })
    expect(store.loading).toBe(true)
    resolve(okResponse({}))
    await first

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(store.loading).toBe(false)
  })

  it('si la petición falla se queda con los valores por defecto', async () => {
    selectCompany(1)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500 })))
    const store = useSaleConfigStore()
    await store.load()
    expect(store.moneda).toBe('USD')
    expect(store.loadedFor).toBeNull()
    expect(store.loading).toBe(false)

    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('red'))))
    await store.load()
    expect(store.loadedFor).toBeNull()
  })

  it('apply mezcla la configuración guardada y la marca como cargada', () => {
    selectCompany(4)
    const store = useSaleConfigStore()
    store.apply({ moneda: 'GTQ', descuento_activo: true })
    expect(store.config).toMatchObject({ moneda: 'GTQ', descuento_activo: true, iva_activo: false })
    expect(store.loadedFor).toBe(4)
  })

  it('money formatea con la moneda de la empresa', () => {
    const store = useSaleConfigStore()
    store.apply({ moneda: 'GTQ' })
    expect(store.money(10)).toContain('Q.')
  })
})

describe('birdie store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('abre, cierra y alterna el asistente', () => {
    const store = useBirdieStore()
    expect(store.isOpen).toBe(false)
    store.open()
    expect(store.isOpen).toBe(true)
    store.close()
    expect(store.isOpen).toBe(false)
    store.toggle()
    expect(store.isOpen).toBe(true)
    store.toggle()
    expect(store.isOpen).toBe(false)
  })
})
