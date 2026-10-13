import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// `useTheme` guarda el tema en un ref de módulo; cada prueba importa una
// instancia nueva para no heredar el estado de la anterior.
async function freshUseTheme() {
  vi.resetModules()
  const mod = await import('@/composables/useTheme.js')
  return mod.useTheme()
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('usa el tema guardado si es válido', async () => {
    localStorage.setItem('kontrol:theme', 'light')
    const { initTheme, theme } = await freshUseTheme()
    initTheme()
    expect(theme.value).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('ignora un valor guardado inválido y sigue la preferencia del sistema', async () => {
    localStorage.setItem('kontrol:theme', 'sepia')
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { initTheme, theme } = await freshUseTheme()
    initTheme()
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: light)')
    expect(theme.value).toBe('light')
  })

  it('cae al oscuro sin preferencia guardada ni del sistema', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const { initTheme, theme } = await freshUseTheme()
    initTheme()
    expect(theme.value).toBe('dark')
  })

  it('cae al oscuro si el entorno no tiene matchMedia', async () => {
    vi.stubGlobal('matchMedia', undefined)
    const { initTheme, theme } = await freshUseTheme()
    initTheme()
    expect(theme.value).toBe('dark')
  })

  it('setTheme aplica y persiste; toggleTheme alterna', async () => {
    const { setTheme, toggleTheme, theme, availableThemes } = await freshUseTheme()
    expect(availableThemes).toEqual(['dark', 'light'])

    setTheme('light')
    expect(theme.value).toBe('light')
    expect(localStorage.getItem('kontrol:theme')).toBe('light')

    toggleTheme()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('kontrol:theme')).toBe('dark')
  })

  it('setTheme rechaza un tema desconocido', async () => {
    const { setTheme } = await freshUseTheme()
    expect(() => setTheme('sepia')).toThrow('Tema desconocido: "sepia"')
  })

  it('sigue funcionando si localStorage lanza', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const { initTheme, setTheme, theme } = await freshUseTheme()

    initTheme()
    expect(theme.value).toBe('dark')
    setTheme('light')
    expect(theme.value).toBe('light')
  })
})
