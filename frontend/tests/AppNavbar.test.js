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
    expect(wrapper.find('.empresa-role').text()).toBe('owner')
  })

  it('oculta inventario, proyectos, equipos e integraciones sin capacidad', async () => {
    const { wrapper } = await montar({ empresaActual: { id_empresa: 1, nombre: 'Skiot', rol: 'member' }, capabilities: {} })
    const links = wrapper.findAll('.appnav-link').map((l) => l.attributes('href'))
    expect(links).not.toContain('/inventory')
    expect(links).not.toContain('/projects')
    expect(links).not.toContain('/teams')
    expect(links).not.toContain('/integrations')
  })

  it('muestra inventario, proyectos, equipos e integraciones con capacidad completa', async () => {
    const { wrapper } = await montar({
      capabilities: { can_view_inventory: true, can_view_projects: true },
    })
    const links = wrapper.findAll('.appnav-link').map((l) => l.attributes('href'))
    expect(links).toContain('/inventory')
    expect(links).toContain('/projects')
    expect(links).toContain('/teams') // canManageTeams se resuelve por rol 'owner'
    expect(links).toContain('/integrations') // isAdminOrOwner por rol 'owner'
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

  it('click en el avatar cierra sesión y redirige a login', async () => {
    const { wrapper, store } = await montar()
    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('.appnav-avatar').trigger('click')

    expect(store.isLoggedIn).toBe(false)
    expect(pushSpy).toHaveBeenCalledWith({ name: 'login' })
  })

  it('el selector de idioma alterna y persiste la preferencia', async () => {
    const { wrapper } = await montar({ user: { id_usuario: 42 } })
    expect(wrapper.find('.lang-dropdown').exists()).toBe(false)

    await wrapper.find('.lang-btn').trigger('click')
    expect(wrapper.find('.lang-dropdown').exists()).toBe(true)

    await wrapper.findAll('.lang-opt')[1].trigger('click') // Español
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lang-dropdown').exists()).toBe(false)
    expect(localStorage.getItem('locale_42')).toBe('es')
  })

  it('el hamburger alterna el menú y los links lo cierran', async () => {
    const { wrapper } = await montar()
    expect(wrapper.find('.appnav-links').classes()).not.toContain('is-open')

    await wrapper.find('.hamburger').trigger('click')
    expect(wrapper.find('.appnav-links').classes()).toContain('is-open')

    await wrapper.find('.appnav-link').trigger('click')
    expect(wrapper.find('.appnav-links').classes()).not.toContain('is-open')
  })
})
