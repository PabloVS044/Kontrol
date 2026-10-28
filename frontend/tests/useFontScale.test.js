import { describe, it, expect, beforeEach, vi } from 'vitest'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

const ACEPTADO = JSON.stringify({ version: 1, preferences: true })

// El tamaño vive en un ref de módulo; cada prueba importa una instancia nueva
// para no heredar el estado de la anterior.
async function cargar() {
  vi.resetModules()
  const consent = await import('@/composables/useStorageConsent.js')
  const mod = await import('@/composables/useFontScale.js')
  return { ...mod.useFontScale(), FONT_SCALES: mod.FONT_SCALES, consent }
}

const atributo = () => document.documentElement.getAttribute('data-font-scale')

describe('useFontScale', () => {
  beforeEach(() => {
    almacen.clear()
    document.documentElement.removeAttribute('data-font-scale')
  })

  it('sin nada guardado arranca en el tamaño normal y no toca <html>', async () => {
    const { initFontScale, fontScale } = await cargar()
    initFontScale()
    expect(fontScale.value).toBe('default')
    expect(atributo()).toBeNull()
  })

  it('aplica el tamaño guardado al arrancar', async () => {
    almacen.set('kontrol:font-scale', 'larger')
    const { initFontScale, fontScale } = await cargar()
    initFontScale()
    expect(fontScale.value).toBe('larger')
    expect(atributo()).toBe('larger')
  })

  it('ignora un valor guardado desconocido', async () => {
    almacen.set('kontrol:font-scale', 'gigante')
    const { initFontScale, fontScale } = await cargar()
    initFontScale()
    expect(fontScale.value).toBe('default')
    expect(atributo()).toBeNull()
  })

  it('con consentimiento guarda la elección; volver al normal la borra', async () => {
    almacen.set('kontrol:storage-consent', ACEPTADO)
    const { setFontScale } = await cargar()

    setFontScale('largest')
    expect(atributo()).toBe('largest')
    expect(almacen.get('kontrol:font-scale')).toBe('largest')

    setFontScale('default')
    expect(atributo()).toBeNull()
    expect(almacen.has('kontrol:font-scale')).toBe(false)
  })

  it('sin consentimiento aplica el tamaño pero no lo guarda', async () => {
    const { setFontScale, fontScale } = await cargar()
    setFontScale('large')
    expect(fontScale.value).toBe('large')
    expect(atributo()).toBe('large')
    expect(almacen.has('kontrol:font-scale')).toBe(false)
  })

  it('si acepta después, guarda el tamaño que ya había elegido', async () => {
    const { setFontScale, consent } = await cargar()
    setFontScale('larger')
    consent.acceptPreferences()
    expect(almacen.get('kontrol:font-scale')).toBe('larger')
  })

  it('fuera de la aplicación se quita de <html> sin olvidar la elección', async () => {
    const { setFontScale, setFontScaleActive, fontScale } = await cargar()
    setFontScale('larger')

    setFontScaleActive(false)
    expect(atributo()).toBeNull()
    expect(fontScale.value).toBe('larger')

    setFontScaleActive(true)
    expect(atributo()).toBe('larger')
  })

  it('rechaza un tamaño que no existe', async () => {
    const { setFontScale, FONT_SCALES } = await cargar()
    expect(FONT_SCALES[0]).toBe('default')
    expect(() => setFontScale('xl')).toThrow(/desconocido/)
  })

  it('la clave cuenta como preferencia: rechazar el almacenamiento la borra', async () => {
    const { consent } = await cargar()
    expect(consent.PREFERENCE_KEYS).toContain('kontrol:font-scale')
  })
})
