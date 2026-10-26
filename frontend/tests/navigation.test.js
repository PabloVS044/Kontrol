import { describe, it, expect, afterEach, vi } from 'vitest'

vi.mock('@/views/LandingPage.vue', () => ({ default: { template: '<main />' } }))

const { default: router, redirectLegacyProjectTab } = await import('@/router/index.js')
const scrollBehavior = router.options.scrollBehavior

afterEach(() => {
  document.body.innerHTML = ''
})

describe('router — redirección de la pestaña Equipo', () => {
  it('?tab=team lleva a Miembros sin perder el resto de la URL', () => {
    const to = { path: '/projects/7', query: { tab: 'team', foo: 'bar' }, hash: '#x' }
    expect(redirectLegacyProjectTab(to)).toEqual({
      path: '/projects/7',
      query: { tab: 'members', foo: 'bar' },
      hash: '#x',
      replace: true,
    })
  })

  it('cualquier otra pestaña pasa sin cambios', () => {
    for (const tab of [undefined, 'tasks', 'members', 'progress']) {
      expect(redirectLegacyProjectTab({ path: '/projects/7', query: { tab }, hash: '' })).toBe(true)
    }
  })

  it('está conectada al detalle de proyecto', () => {
    const ruta = router.getRoutes().find((r) => r.name === 'project-detail')
    expect(ruta.beforeEnter).toBe(redirectLegacyProjectTab)
  })
})

describe('router — carga diferida (DT-17)', () => {
  it('la landing se carga en diferido, como el resto de las vistas', async () => {
    const landing = router.getRoutes().find((r) => r.name === 'landing')
    const cargar = landing.components.default
    expect(typeof cargar).toBe('function')
    expect((await cargar()).default).toBeDefined()
  })
})

describe('router — Ventas', () => {
  it('/sales existe con los mismos permisos que /inventory', () => {
    const ventas = router.getRoutes().find((r) => r.name === 'sales')
    const inventario = router.getRoutes().find((r) => r.name === 'inventory')
    expect(ventas.path).toBe('/sales')
    expect(ventas.meta).toEqual(inventario.meta)
  })
})

describe('router — scrollBehavior', () => {
  it('sin hash sube arriba, como antes', () => {
    expect(scrollBehavior({ hash: '' }, {}, null)).toEqual({ top: 0, behavior: 'instant' })
  })

  it('al volver atrás respeta la posición guardada, aunque haya hash', () => {
    document.body.innerHTML = '<section id="sale-config"></section>'
    const guardada = { left: 0, top: 480 }
    expect(scrollBehavior({ hash: '#sale-config' }, {}, guardada)).toBe(guardada)
  })

  it('con hash baja a la sección, dejando sitio a la barra fija', () => {
    document.body.innerHTML = '<section id="sale-config"></section>'
    expect(scrollBehavior({ hash: '#sale-config' }, {}, null)).toEqual({
      el: '#sale-config',
      top: -72,
      behavior: 'instant',
    })
  })

  it('si la sección no existe, se comporta como sin hash', () => {
    expect(scrollBehavior({ hash: '#no-existe' }, {}, null)).toEqual({ top: 0, behavior: 'instant' })
  })
})
