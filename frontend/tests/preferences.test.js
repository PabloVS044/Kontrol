import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import { useAuthStore } from '@/stores/auth'

/**
 * Preferencias por usuario.
 *
 * El toggle del asistente no vive en la configuración de la empresa a propósito:
 * esa la edita solo el dueño y se aplicaría a todo el equipo, y esconder una
 * burbuja flotante es decisión de quien mira la pantalla.
 */
describe('preferences — visibilidad del asistente', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('por defecto la burbuja se ve: quien no toca nada espera la app como estaba', () => {
    const prefs = usePreferencesStore()
    prefs.load()
    expect(prefs.birdieVisible).toBe(true)
  })

  it('ocultarla persiste entre sesiones', () => {
    const auth = useAuthStore()
    auth.user = { id_usuario: 7 }

    const prefs = usePreferencesStore()
    prefs.load()
    prefs.setBirdieVisible(false)

    // Nueva sesión: mismo usuario, store nuevo.
    setActivePinia(createPinia())
    const auth2 = useAuthStore()
    auth2.user = { id_usuario: 7 }
    const prefs2 = usePreferencesStore()
    prefs2.load()

    expect(prefs2.birdieVisible).toBe(false)
  })

  it('la preferencia es de cada usuario, no del navegador', () => {
    const auth = useAuthStore()
    auth.user = { id_usuario: 7 }
    const prefs = usePreferencesStore()
    prefs.load()
    prefs.setBirdieVisible(false)

    // Otro usuario en el mismo equipo arranca con su propio valor.
    setActivePinia(createPinia())
    const otro = useAuthStore()
    otro.user = { id_usuario: 99 }
    const prefsOtro = usePreferencesStore()
    prefsOtro.load()

    expect(prefsOtro.birdieVisible).toBe(true)
  })

  it('un valor corrupto en el almacenamiento no tumba el arranque', () => {
    const auth = useAuthStore()
    auth.user = { id_usuario: 7 }
    localStorage.setItem('prefs_7', 'esto no es json')

    const prefs = usePreferencesStore()
    expect(() => prefs.load()).not.toThrow()
    expect(prefs.birdieVisible).toBe(true)
  })

  it('si el almacenamiento falla, la preferencia dura la sesión', () => {
    const prefs = usePreferencesStore()
    prefs.load()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('modo privado')
    })

    expect(() => prefs.setBirdieVisible(false)).not.toThrow()
    expect(prefs.birdieVisible).toBe(false)
    spy.mockRestore()
  })
})
