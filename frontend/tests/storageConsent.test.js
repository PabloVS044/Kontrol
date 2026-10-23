import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Consentimiento para el almacenamiento no imprescindible (L-3).
 *
 * Criterio: nada no imprescindible se escribe antes de que el usuario decida,
 * la decisión persiste entre cargas y se puede cambiar.
 */

// Shim con `length` y `key` para poder recorrer las claves con prefijo. Node 25
// trae un localStorage propio que tapa el de happy-dom.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
  clear: () => almacen.clear(),
  key: (i) => [...almacen.keys()][i] ?? null,
  get length() {
    return almacen.size
  },
}

// El estado de la decisión vive en el módulo: cada prueba lo carga de nuevo,
// como pasaría al recargar la página.
async function cargar() {
  vi.resetModules()
  return import('@/composables/useStorageConsent.js')
}

const ESENCIALES = {
  token: 'jwt',
  user: '{"id_usuario":7}',
  empresas: '[]',
  empresaActual: '{"id_empresa":1}',
  accessContext: '{}',
  'kontrol:legal-consent': '{"version":"1.0","users":["7"]}',
}

describe('useStorageConsent', () => {
  beforeEach(() => almacen.clear())

  it('sin decisión no escribe ninguna preferencia', async () => {
    const consent = await cargar()

    expect(consent.useStorageConsent().decision.value).toBeNull()
    expect(consent.setPreferenceItem('kontrol:locale', 'es')).toBe(false)
    expect(consent.setPreferenceItem('projects-view-mode', 'list')).toBe(false)
    expect([...almacen.keys()]).toEqual([])
  })

  it('aceptar guarda la decisión y desde entonces las preferencias', async () => {
    const consent = await cargar()
    consent.acceptPreferences()

    expect(JSON.parse(almacen.get(consent.CONSENT_KEY))).toMatchObject({ version: 1, preferences: true })
    expect(consent.setPreferenceItem('kontrol:locale', 'es')).toBe(true)
    expect(almacen.get('kontrol:locale')).toBe('es')
  })

  it('la decisión sobrevive a una recarga', async () => {
    ;(await cargar()).acceptPreferences()

    const recargado = await cargar()
    expect(recargado.useStorageConsent().decision.value).toBe('accepted')
    expect(recargado.preferencesAllowed()).toBe(true)
  })

  it('rechazar no escribe preferencias y borra las que ya hubiera', async () => {
    Object.entries(ESENCIALES).forEach(([k, v]) => almacen.set(k, v))
    almacen.set('kontrol:locale', 'es')
    almacen.set('kontrol:theme', 'light')
    almacen.set('projects-view-mode', 'list')
    almacen.set('birdie-fab-position', '{"x":1,"y":2}')
    almacen.set('birdie-assistant-home', '{"x":1,"y":2}')
    almacen.set('prefs_7', '{"birdieVisible":false}')
    almacen.set('prefs_anon', '{"birdieVisible":false}')
    almacen.set('locale_7', 'es')

    const consent = await cargar()
    consent.rejectPreferences()

    expect(consent.setPreferenceItem('kontrol:locale', 'en')).toBe(false)
    expect(Object.fromEntries(almacen)).toEqual({
      ...ESENCIALES,
      [consent.CONSENT_KEY]: almacen.get(consent.CONSENT_KEY),
    })
    expect(JSON.parse(almacen.get(consent.CONSENT_KEY)).preferences).toBe(false)
  })

  it('la decisión se puede cambiar en los dos sentidos', async () => {
    const consent = await cargar()
    const { decision } = consent.useStorageConsent()

    consent.acceptPreferences()
    consent.setPreferenceItem('projects-view-mode', 'list')
    consent.rejectPreferences()
    expect(decision.value).toBe('rejected')
    expect(almacen.has('projects-view-mode')).toBe(false)

    consent.acceptPreferences()
    expect(decision.value).toBe('accepted')
    expect(consent.setPreferenceItem('projects-view-mode', 'grid')).toBe(true)
  })

  it('una versión anterior de la decisión cuenta como no decidida', async () => {
    almacen.set('kontrol:storage-consent', JSON.stringify({ version: 0, preferences: true }))
    const consent = await cargar()

    expect(consent.useStorageConsent().decision.value).toBeNull()
    expect(consent.preferencesAllowed()).toBe(false)
  })

  it('un valor corrupto cuenta como no decidido', async () => {
    almacen.set('kontrol:storage-consent', 'no es json')
    const consent = await cargar()

    expect(consent.useStorageConsent().decision.value).toBeNull()
  })

  it('al aceptar avisa a quien guarda lo elegido antes de decidir', async () => {
    const consent = await cargar()
    const pendiente = vi.fn(() => consent.setPreferenceItem('kontrol:locale', 'es'))
    consent.onPreferencesAccepted(pendiente)

    consent.acceptPreferences()

    expect(pendiente).toHaveBeenCalledOnce()
    expect(almacen.get('kontrol:locale')).toBe('es')
  })

  it('si el almacenamiento falla, la decisión vale para la pestaña pero no guarda preferencias', async () => {
    const consent = await cargar()
    const setItem = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => consent.acceptPreferences()).not.toThrow()
    expect(consent.useStorageConsent().decision.value).toBe('accepted')
    expect(consent.preferencesAllowed()).toBe(false)
    setItem.mockRestore()
  })

  it('solo el almacenamiento imprescindible escribe directo en el navegador', () => {
    // Una preferencia nueva tiene que pasar por setPreferenceItem y entrar en
    // el inventario (docs/legal/inventario-almacenamiento-navegador.md).
    const permitidos = new Set([
      'services/http.js',
      'stores/auth.js',
      'composables/useLegalConsent.js',
      'composables/useStorageConsent.js',
    ])
    const raiz = fileURLToPath(new URL('../src/', import.meta.url))
    const escritura = /localStorage\.setItem|sessionStorage|indexedDB|document\.cookie/

    const infractores = readdirSync(raiz, { recursive: true })
      .map((ruta) => String(ruta).replaceAll('\\', '/'))
      .filter((ruta) => /\.(js|vue)$/.test(ruta) && !permitidos.has(ruta))
      .filter((ruta) => escritura.test(readFileSync(join(raiz, ruta), 'utf8')))

    expect(infractores).toEqual([])
  })

  it('openPanel y closePanel controlan el aviso para cambiar la decisión', async () => {
    const consent = await cargar()
    const { panelOpen, openPanel, closePanel } = consent.useStorageConsent()

    openPanel()
    expect(panelOpen.value).toBe(true)
    closePanel()
    expect(panelOpen.value).toBe(false)
  })
})
