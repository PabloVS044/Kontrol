import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import SettingsView from '@/views/SettingsView.vue'
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

const montar = async ({ rol = 'owner', canManageUsers = rol === 'owner', path = '/settings' } = {}) => {
  const store = useAuthStore()
  store.setEmpresaActual({ id_empresa: 1, nombre: 'Skiot', rol })
  store.setAccessContext({ capabilities: { can_manage_users: canManageUsers } })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: Stub },
      { path: '/integrations', component: Stub },
      { path: '/billing', component: Stub },
      { path: '/dashboard', component: Stub },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(SettingsView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true, LanguageSelector: true },
    },
  })
  await flushPromises()
  return wrapper
}

const enlaces = (wrapper) => wrapper.findAll('.sc-link').map((l) => l.attributes('href'))

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsView.vue — configuración unificada', () => {
  it('se ve con la barra de navegación, como el resto de secciones', async () => {
    const wrapper = await montar()
    expect(wrapper.findComponent({ name: 'AppNavbar' }).exists()).toBe(true)
  })

  it('el tamaño de letra está en las preferencias personales, para cualquier rol', async () => {
    const wrapper = await montar({ rol: 'collaborator' })
    const prefs = wrapper.find('.set-card--prefs')
    expect(prefs.find('label[for="font-scale"]').text()).toBe('Tamaño de letra')
    expect(prefs.find('#font-scale').attributes('type')).toBe('range')
  })

  it('el bloque de venta tiene el ancla a la que lleva Ventas', async () => {
    const wrapper = await montar()
    expect(wrapper.find('#sale-config').exists()).toBe(true)
    expect(wrapper.find('#sale-config .sc-title').text()).toBe('Configuración de venta')
  })

  it('el owner ve integraciones y miembros de la empresa', async () => {
    const wrapper = await montar()
    expect(enlaces(wrapper)).toEqual(['/billing', '/integrations', '/dashboard#company-members'])
  })

  it('el admin ve integraciones pero no miembros de la empresa', async () => {
    // Igual que hoy: integraciones es owner/admin; el panel de miembros, solo owner.
    const wrapper = await montar({ rol: 'admin' })
    expect(enlaces(wrapper)).toEqual(['/billing', '/integrations'])
  })

  it('manager y colaborador no ven integraciones ni miembros, solo el plan', async () => {
    for (const rol of ['manager', 'collaborator']) {
      const wrapper = await montar({ rol })
      expect(enlaces(wrapper)).toEqual(['/billing'])
      expect(wrapper.find('.privacy-action button').exists()).toBe(false)
    }
  })

  // PAY-1 — El plan es de la empresa: cualquier miembro ve cuál tiene.
  it('la tarjeta del plan muestra el plan de la empresa activa', async () => {
    const store = useAuthStore()
    const wrapper = await montar({ rol: 'collaborator' })
    expect(wrapper.find('#plan').text()).toContain('Plan actual: Gratis')

    store.setAccessContext({ capabilities: {}, plan: { code: 'business' } })
    await flushPromises()
    expect(wrapper.find('#plan').text()).toContain('Plan actual: Business')
  })

  it('owner and admin can request a company export, while other members cannot', async () => {
    for (const rol of ['owner', 'admin']) {
      const wrapper = await montar({ rol })
      expect(wrapper.find('.privacy-action button').text()).toBe('Descargar datos de la empresa (JSON)')
    }

    const collaborator = await montar({ rol: 'collaborator' })
    expect(collaborator.text()).toContain('La exportación completa solo está disponible')
  })

  it('explains immediate deletion and the business data that remains', async () => {
    const wrapper = await montar()
    const accountDeletion = wrapper.find('.privacy-delete:not(.privacy-closure)')
    expect(accountDeletion.text()).toContain('no tiene período de gracia')
    expect(accountDeletion.text()).toContain('no define un plazo de conservación')
    expect(accountDeletion.find('button.privacy-delete-button').exists()).toBe(true)
  })
})

// Respuestas del backend por ruta y método; lo demás contesta vacío.
const responder = (routes) => vi.fn(async (url, options = {}) => {
  const key = `${options.method || 'GET'} ${new URL(String(url), 'http://localhost').pathname}`
  const body = routes[key]
  return {
    ok: body?.ok ?? true,
    status: body?.status ?? 200,
    json: async () => body?.json ?? { data: {} },
  }
})
const llamada = (method, path) => globalThis.fetch.mock.calls.find(([url, options = {}]) =>
  (options.method || 'GET') === method && String(url).endsWith(path))
const confirmar = (respuesta) => { window.confirm = vi.fn(() => respuesta) }
const enCierre = {
  company_id: 1,
  company_name: 'Skiot',
  reason: 'owner_request',
  status: 'export_window',
  requested_at: '2026-10-26T12:00:00.000Z',
  export_until: '2026-11-25T12:00:00.000Z',
  delete_by: '2026-12-25T12:00:00.000Z',
  backups_by: '2027-01-24T12:00:00.000Z',
}

describe('SettingsView.vue — cierre de la empresa', () => {
  it('solo el owner ve el formulario de cierre', async () => {
    expect((await montar()).find('.privacy-closure').exists()).toBe(true)
    for (const rol of ['admin', 'collaborator']) {
      expect((await montar({ rol })).find('.privacy-closure').exists()).toBe(false)
    }
  })

  it('pide el nombre y la contraseña, envía el cierre y muestra los plazos', async () => {
    globalThis.fetch = responder({ 'POST /api/companies/closure': { json: { data: enCierre } } })
    confirmar(true)
    const wrapper = await montar()
    const boton = () => wrapper.find('.privacy-closure-button')
    expect(boton().attributes('disabled')).toBeDefined()

    await wrapper.find('#company-close-name').setValue('Skiot')
    await wrapper.find('#company-close-password').setValue('secreta')
    await wrapper.find('.privacy-closure input[type="checkbox"]').setValue(true)
    expect(boton().attributes('disabled')).toBeUndefined()
    await boton().trigger('click')
    await flushPromises()

    const [, options] = llamada('POST', '/api/companies/closure')
    expect(JSON.parse(options.body)).toEqual({ confirm_name: 'Skiot', password: 'secreta', skip_export_window: true })
    expect(wrapper.find('.privacy-closure-status').text()).toContain('Esta empresa está en cierre')
    expect(wrapper.find('.privacy-closure').exists()).toBe(false)
  })

  it('no envía nada si el owner no confirma', async () => {
    confirmar(false)
    const wrapper = await montar()
    await wrapper.find('#company-close-name').setValue('Skiot')
    await wrapper.find('#company-close-password').setValue('secreta')
    await wrapper.find('.privacy-closure-button').trigger('click')
    expect(llamada('POST', '/api/companies/closure')).toBeUndefined()
  })

  it('muestra el error del servidor si el cierre falla', async () => {
    globalThis.fetch = responder({
      'POST /api/companies/closure': { ok: false, status: 400, json: { message: 'The company name does not match.' } },
    })
    confirmar(true)
    const wrapper = await montar()
    await wrapper.find('#company-close-name').setValue('Otra')
    await wrapper.find('#company-close-password').setValue('secreta')
    await wrapper.find('.privacy-closure-button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.privacy-closure [role="alert"]').text()).toBe('The company name does not match.')
  })

  it('una empresa en cierre muestra los plazos y el owner puede anularlo', async () => {
    globalThis.fetch = responder({
      'GET /api/companies/closure': { json: { data: enCierre } },
      'DELETE /api/companies/closure': { json: { data: { company_id: 1, status: 'active' } } },
    })
    const wrapper = await montar()
    expect(wrapper.find('.privacy-closure-status').text()).toContain('Puedes descargar sus datos hasta el')

    await wrapper.find('.privacy-closure-cancel').trigger('click')
    await flushPromises()
    expect(llamada('DELETE', '/api/companies/closure')).toBeDefined()
    expect(wrapper.text()).toContain('Se anuló el cierre')
    expect(wrapper.find('.privacy-closure').exists()).toBe(true)
  })

  it('no ofrece anular el cierre de una empresa que quedó sin titular', async () => {
    globalThis.fetch = responder({
      'GET /api/companies/closure': { json: { data: { ...enCierre, reason: 'no_active_owner' } } },
    })
    const wrapper = await montar()
    expect(wrapper.find('.privacy-closure-status').exists()).toBe(true)
    expect(wrapper.find('.privacy-closure-cancel').exists()).toBe(false)
  })

  it('lista las constancias y permite descargarlas', async () => {
    globalThis.fetch = responder({
      'GET /api/companies/closures/mine': {
        json: { data: [{ ...enCierre, company_id: 9, company_name: 'Vieja', status: 'deleted', deleted_at: '2026-12-01T12:00:00.000Z' }] },
      },
    })
    URL.createObjectURL = vi.fn(() => 'blob:constancia')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = await montar({ rol: 'collaborator' })

    expect(wrapper.find('.privacy-certificates').text()).toContain('Vieja: datos eliminados el')
    await wrapper.find('.privacy-certificates button').trigger('click')
    expect(click).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:constancia')
  })

  it('usa la prueba de Google del cierre en lugar de la contraseña', async () => {
    globalThis.fetch = responder({ 'POST /api/companies/closure': { json: { data: enCierre } } })
    confirmar(true)
    const wrapper = await montar({ path: '/settings#closure_proof=prueba-google' })
    expect(wrapper.text()).toContain('Confirma el cierre de la empresa')
    expect(wrapper.find('.privacy-closure').attributes('open')).toBeDefined()

    await wrapper.find('#company-close-name').setValue('Skiot')
    await wrapper.find('.privacy-closure-button').trigger('click')
    await flushPromises()
    const [, options] = llamada('POST', '/api/companies/closure')
    expect(JSON.parse(options.body)).toMatchObject({ google_reauth_token: 'prueba-google' })
  })

  it('pide a Google una prueba de cierre y muestra el error si no se pudo', async () => {
    globalThis.fetch = responder({
      'POST /api/auth/google/reauth-for-deletion': { ok: false, status: 503, json: { message: 'Google reauthentication is not configured.' } },
    })
    const wrapper = await montar()
    await wrapper.find('.privacy-closure .privacy-google').trigger('click')
    await flushPromises()
    const [, options] = llamada('POST', '/api/auth/google/reauth-for-deletion')
    expect(JSON.parse(options.body)).toEqual({ action: 'company-closure' })
    expect(wrapper.find('.privacy-closure [role="alert"]').text()).toBe('Google reauthentication is not configured.')
  })

  it('muestra en el cierre el error de Google que vuelve a esta página', async () => {
    const wrapper = await montar({ path: '/settings?reauth_error=google_cancelled&reauth_for=company-closure' })
    expect(wrapper.find('.privacy-closure [role="alert"]').text()).toContain('No se pudo verificar la cuenta de Google')
  })
})
