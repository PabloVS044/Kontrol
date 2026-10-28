import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import AppNavbar from '@/components/AppNavbar.vue'
import { useAuthStore } from '@/stores/auth'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

const Stub = { template: '<div />' }
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Stub },
    { path: '/login', name: 'login', component: Stub },
    { path: '/onboarding', component: Stub },
    { path: '/dashboard', name: 'dashboard', component: Stub },
    { path: '/inventory', name: 'inventory', component: Stub },
    { path: '/sales', component: Stub },
    { path: '/suppliers', component: Stub },
    { path: '/settings', component: Stub },
    { path: '/projects', name: 'projects', component: Stub },
    { path: '/teams', component: Stub },
    { path: '/budget', component: Stub },
    { path: '/reports', component: Stub },
    { path: '/chat', component: Stub },
    { path: '/marketing', component: Stub },
    { path: '/agent', component: Stub },
    { path: '/integrations', component: Stub },
  ],
})

let mounted = []

const montar = async ({ empresaActual = { id_empresa: 1, nombre: 'Skiot', rol: 'owner' }, empresas, user, capabilities = {}, locale = 'es' } = {}) => {
  const store = useAuthStore()
  store.setToken('jwt-de-prueba')
  store.setUser(user ?? { id_usuario: 9, nombre: 'Jonathan' })
  store.setEmpresas(empresas ?? [
    { id_empresa: 1, nombre: 'Skiot', rol: 'owner' },
    { id_empresa: 2, nombre: 'Otra Empresa', rol: 'member' },
  ])
  store.setEmpresaActual(empresaActual)
  store.setAccessContext({ capabilities })
  vi.spyOn(store, 'loadAccessContext').mockResolvedValue()

  await router.push('/dashboard')
  await router.isReady()

  const wrapper = mount(AppNavbar, {
    attachTo: document.body,
    global: {
      plugins: [
        router,
        createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } }),
      ],
    },
  })
  await wrapper.vm.$nextTick()
  mounted.push(wrapper)
  return { wrapper, store }
}

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  mounted.forEach((w) => w.unmount())
  mounted = []
  document.body.innerHTML = ''
})

describe('AppNavbar.vue — visibilidad por permisos', () => {
  it('no muestra el selector de empresa cuando el usuario no tiene ninguna', async () => {
    const { wrapper } = await montar({ empresas: [], empresaActual: null })
    expect(wrapper.find('.empresa-selector').exists()).toBe(false)
  })

  it('muestra el nombre y rol de la empresa actual', async () => {
    const { wrapper } = await montar()
    expect(wrapper.find('.empresa-name').text()).toBe('Skiot')
    // El rol llega en inglés desde la base de datos; en pantalla va traducido.
    expect(wrapper.find('.empresa-role').text()).toBe('Propietario')
  })

  it('traduce el rol que llega en inglés de la base de datos', async () => {
    // El perfil decía "COLLABORATOR" con la app en español: el valor es del
    // esquema (hay permisos que dependen de esa cadena), la etiqueta no.
    const { wrapper } = await montar({
      empresaActual: { id_empresa: 1, nombre: 'Skiot', rol: 'collaborator' },
    })
    expect(wrapper.find('.empresa-role').text()).toBe('Colaborador')
  })

  it('el menú lateral nombra Proveedores en español', async () => {
    // "Suppliers" estaba escrito en el código de navegación, no en el
    // diccionario, así que no cambiaba de idioma nunca.
    const { wrapper } = await montar({ capabilities: { can_view_inventory: true } })
    const enlaces = wrapper.findAll('.appnav-link').map((l) => l.text())
    expect(enlaces).toContain('Proveedores')
    expect(enlaces).not.toContain('Suppliers')
  })

  it('oculta inventario, proyectos, equipos e integraciones sin capacidad', async () => {
    const { wrapper } = await montar({ empresaActual: { id_empresa: 1, nombre: 'Skiot', rol: 'member' }, capabilities: {} })
    const links = wrapper.findAll('.appnav-link').map((l) => l.attributes('href'))
    expect(links).not.toContain('/inventory')
    expect(links).not.toContain('/projects')
    expect(links).not.toContain('/teams')
    expect(links).not.toContain('/integrations')
    expect(links).not.toContain('/sales')
  })

  it('muestra ventas, inventario, proyectos y equipos con capacidad completa', async () => {
    const { wrapper } = await montar({
      capabilities: { can_view_inventory: true, can_view_projects: true, can_sell_inventory: true },
    })
    const links = wrapper.findAll('.appnav-link').map((l) => l.attributes('href'))
    expect(links).toContain('/sales')
    expect(links).toContain('/inventory')
    expect(links).toContain('/projects')
    expect(links).toContain('/teams') // canManageTeams se resuelve por rol 'owner'
  })

  it('integraciones sale del menú principal incluso para el owner', async () => {
    // Vive como tarjeta dentro de Configuración; su ruta no cambia.
    const { wrapper } = await montar({ capabilities: { can_view_inventory: true } })
    const links = wrapper.findAll('.appnav-link').map((l) => l.attributes('href'))
    expect(links).not.toContain('/integrations')
  })

  it('configuración está en el menú principal para cualquier rol', async () => {
    for (const rol of ['collaborator', 'manager', 'admin', 'owner']) {
      const { wrapper } = await montar({ empresaActual: { id_empresa: 1, nombre: 'A', rol } })
      const links = wrapper.findAll('.appnav-link').map((l) => l.attributes('href'))
      expect(links).toContain('/settings')
    }
  })

  it('el menú usa los nombres en español del card sorting', async () => {
    const { wrapper } = await montar({
      capabilities: { can_view_inventory: true, can_sell_inventory: true },
    })
    const textos = wrapper.findAll('.appnav-link').map((l) => l.text())
    expect(textos).toContain('Inicio')
    expect(textos).toContain('Ventas')
    expect(textos).toContain('Configuración')
    expect(textos).not.toContain('Dashboard')
    expect(textos).not.toContain('Panel')
  })
})

describe('AppNavbar.vue — selector de empresa', () => {
  it('el click en el selector abre el dropdown con las empresas', async () => {
    const { wrapper } = await montar()
    expect(document.querySelector('.empresa-dropdown')).toBeNull()

    await wrapper.find('.empresa-selector').trigger('click')
    const dropdown = document.querySelector('.empresa-dropdown')
    expect(dropdown).not.toBeNull()
    expect(dropdown.querySelectorAll('.dd-item')).toHaveLength(2)
  })

  it('seleccionar una empresa la activa y cierra el dropdown', async () => {
    const { wrapper, store } = await montar()
    await wrapper.find('.empresa-selector').trigger('click')

    const segundoItem = document.querySelectorAll('.dd-item')[1]
    await segundoItem.click()
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(store.idEmpresaActual).toBe(2))

    expect(store.loadAccessContext).toHaveBeenCalled()
    expect(document.querySelector('.empresa-dropdown')).toBeNull()
  })

  it('click en el backdrop cierra el dropdown sin cambiar de empresa', async () => {
    const { wrapper, store } = await montar()
    await wrapper.find('.empresa-selector').trigger('click')

    await document.querySelector('.empresa-backdrop').click()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('.empresa-dropdown')).toBeNull()
    expect(store.idEmpresaActual).toBe(1)
  })

  it('la tecla Escape cierra el dropdown', async () => {
    const { wrapper } = await montar()
    await wrapper.find('.empresa-selector').trigger('click')
    expect(document.querySelector('.empresa-dropdown')).not.toBeNull()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.empresa-dropdown')).toBeNull()
  })
})

describe('AppNavbar.vue — sesión e idioma', () => {
  it('el avatar muestra la inicial del nombre de usuario', async () => {
    const { wrapper } = await montar({ user: { id_usuario: 9, nombre: 'martina' } })
    expect(wrapper.find('.appnav-avatar').text()).toBe('M')
  })

  it('sin nombre, usa la inicial del email; sin ninguno, "U"', async () => {
    const { wrapper: conEmail } = await montar({ user: { id_usuario: 9, email: 'ana@kontrol.dev' } })
    expect(conEmail.find('.appnav-avatar').text()).toBe('A')

    const { wrapper: sinDatos } = await montar({ user: { id_usuario: 9 } })
    expect(sinDatos.find('.appnav-avatar').text()).toBe('U')
  })

  it('el avatar abre el menú de cuenta en vez de cerrar sesión de golpe', async () => {
    // Una inicial suelta se lee como "ver mi perfil": el clic destruía la sesión
    // sin anunciarlo. Ahora abre un menú donde el cierre está escrito.
    const { wrapper, store } = await montar()

    expect(wrapper.find('.user-dropdown').exists()).toBe(false)

    await wrapper.find('.appnav-avatar').trigger('click')

    expect(wrapper.find('.user-dropdown').exists()).toBe(true)
    expect(store.isLoggedIn).toBe(true)
  })

  it('el menú de cuenta nombra la acción de cerrar sesión', async () => {
    const { wrapper } = await montar()
    await wrapper.find('.appnav-avatar').trigger('click')

    expect(wrapper.find('.ud-item--signout').text()).toContain('Cerrar sesión')
  })

  it('cerrar sesión desde el menú termina la sesión y redirige a login', async () => {
    const { wrapper, store } = await montar()
    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('.appnav-avatar').trigger('click')
    await wrapper.find('.ud-item--signout').trigger('click')

    expect(store.isLoggedIn).toBe(false)
    expect(pushSpy).toHaveBeenCalledWith({ name: 'login' })
  })

  it('el menú muestra el nombre y el email de quien ha entrado', async () => {
    const { wrapper } = await montar({
      user: { id_usuario: 9, nombre: 'Martina', apellido: 'Lopez', email: 'martina@kontrol.dev' },
    })
    await wrapper.find('.appnav-avatar').trigger('click')

    expect(wrapper.find('.ud-name').text()).toBe('Martina Lopez')
    expect(wrapper.find('.ud-email').text()).toBe('martina@kontrol.dev')
  })

  it('el avatar declara que abre un menú y si está abierto', async () => {
    const { wrapper } = await montar()
    const avatar = wrapper.find('.appnav-avatar')

    expect(avatar.attributes('aria-haspopup')).toBe('menu')
    expect(avatar.attributes('aria-expanded')).toBe('false')

    await avatar.trigger('click')
    expect(wrapper.find('.appnav-avatar').attributes('aria-expanded')).toBe('true')
  })

  it('la configuración está al alcance de cualquier rol', async () => {
    // La pantalla tiene preferencias personales —ocultar el asistente— además
    // de la configuración de empresa; esa se reserva al dueño dentro de la vista.
    for (const rol of ['member', 'manager', 'owner']) {
      const { wrapper } = await montar({ empresaActual: { id_empresa: 1, nombre: 'A', rol } })
      await wrapper.find('.appnav-avatar').trigger('click')
      expect(wrapper.find('.ud-item[href="/settings"]').exists()).toBe(true)
    }
  })

  it('el selector de idioma alterna y persiste la preferencia', async () => {
    // Persistir el idioma requiere haber aceptado las preferencias (L-3).
    localStorage.setItem('kontrol:storage-consent', JSON.stringify({ version: 1, preferences: true }))
    const { wrapper } = await montar({ user: { id_usuario: 42 } })
    expect(wrapper.find('.lang-dropdown').exists()).toBe(false)

    await wrapper.find('.lang-btn').trigger('click')
    expect(wrapper.find('.lang-dropdown').exists()).toBe(true)

    await wrapper.findAll('.lang-opt')[1].trigger('click') // Español
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lang-dropdown').exists()).toBe(false)
    // Clave del navegador, no de la cuenta: la preferencia tiene que seguir ahí
    // después de cerrar sesión, cuando ya no hay id de usuario que consultar.
    expect(localStorage.getItem('kontrol:locale')).toBe('es')
  })

  it('cerrar sesión no devuelve la app al inglés', async () => {
    // Antes el logout hacía `locale.value = 'en'`, así que la pantalla de login
    // aparecía en inglés justo después de haber elegido español.
    localStorage.setItem('kontrol:storage-consent', JSON.stringify({ version: 1, preferences: true }))
    const { wrapper } = await montar({ user: { id_usuario: 42 }, locale: 'es' })

    await wrapper.find('.lang-btn').trigger('click')
    await wrapper.findAll('.lang-opt')[1].trigger('click') // Español
    await wrapper.find('.appnav-avatar').trigger('click')
    await wrapper.find('.ud-item--signout').trigger('click')

    expect(wrapper.vm.$i18n.locale).toBe('es')
    expect(localStorage.getItem('kontrol:locale')).toBe('es')
  })

  it('el hamburger alterna el menú y los links lo cierran', async () => {
    const { wrapper } = await montar()
    expect(wrapper.find('.appnav-links').classes()).not.toContain('is-open')

    await wrapper.find('.hamburger').trigger('click')
    expect(wrapper.find('.appnav-links').classes()).toContain('is-open')

    await wrapper.find('.appnav-link').trigger('click')
    expect(wrapper.find('.appnav-links').classes()).not.toContain('is-open')
  })

  it('el hamburger declara qué controla y si está abierto', async () => {
    const { wrapper } = await montar()
    const burger = wrapper.find('.hamburger')

    expect(burger.attributes('aria-controls')).toBe('appnav-links')
    expect(burger.attributes('aria-expanded')).toBe('false')

    await burger.trigger('click')
    expect(wrapper.find('.hamburger').attributes('aria-expanded')).toBe('true')
  })

  it('tocar fuera cierra el cajón sin tener que volver al hamburger', async () => {
    const { wrapper } = await montar()
    await wrapper.find('.hamburger').trigger('click')
    expect(wrapper.find('.appnav-backdrop').exists()).toBe(true)

    await wrapper.find('.appnav-backdrop').trigger('click')
    expect(wrapper.find('.appnav-links').classes()).not.toContain('is-open')
  })

  it('Escape cierra el cajón: sin ratón no había salida', async () => {
    const { wrapper } = await montar()
    await wrapper.find('.hamburger').trigger('click')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.appnav-links').classes()).not.toContain('is-open')
  })

  it('todos los enlaces permitidos están en el cajón, no solo los que caben', async () => {
    // El fallo original: la fila cortaba marketing, IA y el último enlace fuera
    // del ancho y no había forma de alcanzarlos. El cajón los contiene todos.
    const { wrapper } = await montar({ empresaActual: { id_empresa: 1, nombre: 'A', rol: 'owner' } })
    await wrapper.find('.hamburger').trigger('click')

    const hrefs = wrapper.findAll('.appnav-link').map((l) => l.attributes('href'))
    for (const esperado of ['/dashboard', '/marketing', '/agent', '/settings']) {
      expect(hrefs).toContain(esperado)
    }
  })
})

describe('AppNavbar.vue — cajón según el tamaño de letra', () => {
  // happy-dom no evalúa media queries por ancho: se simula una ventana de 1600px.
  const ventana = (ancho) => vi.fn((query) => ({
    matches: ancho <= Number(query.match(/max-width:\s*(\d+)px/)?.[1] ?? Infinity),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))

  afterEach(async () => {
    const { useFontScale } = await import('@/composables/useFontScale.js')
    useFontScale().setFontScale('default')
    vi.unstubAllGlobals()
  })

  it('con la letra normal, en 1600px los enlaces van en fila', async () => {
    vi.stubGlobal('matchMedia', ventana(1600))
    const { wrapper } = await montar()
    expect(wrapper.find('.appnav').classes()).not.toContain('appnav--drawer')
  })

  it('con la letra más grande la fila no cabe en 1600px y se pliega en el cajón', async () => {
    vi.stubGlobal('matchMedia', ventana(1600))
    const { useFontScale } = await import('@/composables/useFontScale.js')
    useFontScale().setFontScale('largest')
    const { wrapper } = await montar()
    expect(wrapper.find('.appnav').classes()).toContain('appnav--drawer')
  })

  it('cambiar el tamaño con la barra montada vuelve a decidir', async () => {
    vi.stubGlobal('matchMedia', ventana(1600))
    const { useFontScale } = await import('@/composables/useFontScale.js')
    const { wrapper } = await montar()
    useFontScale().setFontScale('larger')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.appnav').classes()).toContain('appnav--drawer')
  })
})
