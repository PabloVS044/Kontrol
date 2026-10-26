import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { initLocale, resolveInitialLocale, useLocale } from '@/composables/useLocale.js'
import { i18n } from '@/locales/index.js'
import { acceptPreferences, CONSENT_KEY } from '@/composables/useStorageConsent.js'

function aceptarPreferencias() {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 1, preferences: true }))
}

/**
 * Preferencia de idioma (pruebas 9 y 10, bug B-01).
 *
 * El idioma se leía en el `onMounted` del navbar y se guardaba con una clave
 * por usuario. Las rutas sin navbar —login, registro, Configuración, landing—
 * nacían en inglés, y cerrar sesión borraba el id con el que se resolvía la
 * clave, así que la app "olvidaba" la preferencia.
 */
describe('useLocale — la preferencia de idioma', () => {
  const almacen = new Map()

  beforeEach(() => {
    almacen.clear()
    globalThis.localStorage = {
      getItem: (k) => almacen.get(k) ?? null,
      setItem: (k, v) => almacen.set(k, String(v)),
      removeItem: (k) => almacen.delete(k),
      clear: () => almacen.clear(),
    }
    // Estas pruebas parten de las preferencias aceptadas; las de abajo cubren
    // qué pasa sin consentimiento (L-3).
    aceptarPreferencias()
    i18n.global.locale.value = 'en'
    document.documentElement.removeAttribute('lang')
  })

  afterEach(() => vi.restoreAllMocks())

  it('se guarda en una clave del navegador, no de la cuenta', () => {
    // Cerrar sesión ya no puede dejar la preferencia inalcanzable.
    const { wrapper } = montarConsumidor()
    wrapper.vm.setLocale('es')

    expect(localStorage.getItem('kontrol:locale')).toBe('es')
  })

  it('se aplica al arrancar, antes de que exista ningún navbar', () => {
    localStorage.setItem('kontrol:locale', 'es')

    initLocale()

    expect(i18n.global.locale.value).toBe('es')
  })

  it('rescata la preferencia guardada con el esquema viejo por usuario', () => {
    // Quien ya había elegido español no debe volver al inglés al actualizar.
    localStorage.setItem('user', JSON.stringify({ id_usuario: 42 }))
    localStorage.setItem('locale_42', 'es')

    expect(resolveInitialLocale()).toBe('es')
    expect(localStorage.getItem('kontrol:locale')).toBe('es')
  })

  it('sin preferencia, respeta el idioma del navegador', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-GT')
    expect(resolveInitialLocale()).toBe('es')
  })

  it('sin preferencia ni idioma reconocible, cae al inglés', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
    expect(resolveInitialLocale()).toBe('en')
  })

  it('escribe el idioma en <html lang> para el lector de pantalla', () => {
    const { wrapper } = montarConsumidor()
    wrapper.vm.setLocale('es')

    expect(document.documentElement.getAttribute('lang')).toBe('es')
  })

  it('un idioma desconocido es un error de programación, no un cambio silencioso', () => {
    const { wrapper } = montarConsumidor()
    expect(() => wrapper.vm.setLocale('fr')).toThrow(/Idioma desconocido/)
  })

  it('alternar va y vuelve entre los dos idiomas', () => {
    const { wrapper } = montarConsumidor()

    wrapper.vm.toggleLocale()
    expect(wrapper.vm.locale).toBe('es')

    wrapper.vm.toggleLocale()
    expect(wrapper.vm.locale).toBe('en')
  })

  it('ignora un valor corrupto en el almacenamiento', () => {
    localStorage.setItem('kontrol:locale', 'klingon')
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')

    expect(resolveInitialLocale()).toBe('en')
  })

  describe('sin consentimiento para preferencias', () => {
    beforeEach(() => localStorage.removeItem(CONSENT_KEY))

    it('aplica el idioma pero no lo guarda', () => {
      const { wrapper } = montarConsumidor()
      wrapper.vm.setLocale('es')

      expect(wrapper.vm.locale).toBe('es')
      expect(document.documentElement.getAttribute('lang')).toBe('es')
      expect(localStorage.getItem('kontrol:locale')).toBeNull()
    })

    it('respeta la clave antigua sin migrarla', () => {
      localStorage.setItem('user', JSON.stringify({ id_usuario: 42 }))
      localStorage.setItem('locale_42', 'es')

      expect(resolveInitialLocale()).toBe('es')
      expect(localStorage.getItem('kontrol:locale')).toBeNull()
    })

    it('al aceptar guarda el idioma elegido antes de decidir', () => {
      const { wrapper } = montarConsumidor()
      wrapper.vm.setLocale('es')

      acceptPreferences()

      expect(localStorage.getItem('kontrol:locale')).toBe('es')
    })
  })

  /** Monta un componente mínimo que expone el composable. */
  function montarConsumidor(locale = 'en') {
    const wrapper = mount(
      {
        template: '<div />',
        setup() {
          return useLocale()
        },
      },
      {
        global: {
          plugins: [
            createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en: {}, es: {} } }),
          ],
        },
      },
    )
    return { wrapper }
  }
})
