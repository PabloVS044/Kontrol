import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import appRouter from '@/router/index.js'
import NotFoundView from '@/views/NotFoundView.vue'
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

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'landing', component: Stub },
      { path: '/dashboard', name: 'dashboard', component: Stub },
      { path: '/admin', name: 'admin-dashboard', component: Stub },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
    ],
  })
}

let montados = []

async function montar({ user, token, historyState = {} } = {}) {
  const store = useAuthStore()
  if (token) store.setToken(token)
  if (user) store.setUser(user)

  window.history.replaceState(historyState, '')
  const router = crearRouter()
  await router.push('/no/existe?x=1')
  await router.isReady()

  const wrapper = mount(NotFoundView, {
    attachTo: document.body,
    global: {
      // three.js necesita WebGL, que happy-dom no tiene.
      stubs: { KontrolLogo3D: true },
      plugins: [
        router,
        createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } }),
      ],
    },
  })
  montados.push(wrapper)
  return wrapper
}

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  montados.forEach((w) => w.unmount())
  montados = []
  window.history.replaceState({}, '')
})

describe('NotFoundView', () => {
  it('muestra «4 K 4» con el logo 3D en lugar del cero', async () => {
    const w = await montar()
    const codigo = w.find('.nf-code')
    expect(codigo.attributes('aria-label')).toBe(es.notFound.codeLabel)
    expect(codigo.findAll('.nf-digit').map((d) => d.text())).toEqual(['4', '4'])
    expect(codigo.findComponent({ name: 'KontrolLogo3D' }).exists()).toBe(true)
  })

  it('muestra el texto traducido y la ruta pedida tachada', async () => {
    const w = await montar()
    expect(w.find('h1').text()).toBe(es.notFound.title)
    expect(w.find('.nf-path s').text()).toBe('/no/existe?x=1')
    expect(w.find('.nf-path .visually-hidden').text()).toBe(es.notFound.missingPath)
  })

  it('sin sesión, «Ir al inicio» lleva a la landing', async () => {
    const w = await montar()
    expect(w.find('a.nf-btn--primary').attributes('href')).toBe('/')
  })

  it('con sesión, lleva al dashboard', async () => {
    const w = await montar({ token: 'jwt', user: { id_usuario: 1, nombre_rol: 'usuario' } })
    expect(w.find('a.nf-btn--primary').attributes('href')).toBe('/dashboard')
  })

  it('un superusuario va al panel de administración', async () => {
    const w = await montar({ token: 'jwt', user: { id_usuario: 1, nombre_rol: 'super_user' } })
    expect(w.find('a.nf-btn--primary').attributes('href')).toBe('/admin')
  })

  it('solo ofrece «Volver» si se llegó navegando dentro de la app', async () => {
    const desdeFuera = await montar()
    expect(desdeFuera.find('.nf-btn--ghost').exists()).toBe(false)

    const desdeLaApp = await montar({ historyState: { back: '/projects' } })
    expect(desdeLaApp.find('.nf-btn--ghost').text()).toBe(es.notFound.back)
  })
})

describe('router — ruta comodín', () => {
  it('cualquier ruta desconocida resuelve a la 404, pública y sin AppSurface', () => {
    for (const path of ['/no-existe', '/projects/1/algo/raro', '/admin/x/y']) {
      const r = appRouter.resolve(path)
      expect(r.name, path).toBe('not-found')
      expect(r.meta.requiresAuth).toBeFalsy()
      expect(r.meta.surface).toBeFalsy()
    }
  })

  it('las rutas existentes no caen en la 404', () => {
    for (const path of ['/', '/login', '/dashboard', '/projects/3']) {
      expect(appRouter.resolve(path).name, path).not.toBe('not-found')
    }
  })
})
