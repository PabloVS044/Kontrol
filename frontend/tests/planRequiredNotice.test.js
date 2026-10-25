import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import PlanRequiredNotice from '@/components/billing/PlanRequiredNotice.vue'
import { useAuthStore } from '@/stores/auth'

// PAY-1 — Aviso "Mejora tu plan" que dispara un 403 por plan.

const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

let wrapper
let store

const emitir = async (detail) => {
  window.dispatchEvent(new CustomEvent('api:plan-required', { detail }))
  await flushPromises()
}

beforeEach(async () => {
  almacen.clear()
  setActivePinia(createPinia())
  store = useAuthStore()
  vi.spyOn(store, 'loadAccessContext').mockResolvedValue()

  const Stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/billing', name: 'billing', component: Stub },
    ],
  })
  await router.push('/')
  wrapper = mount(PlanRequiredNotice, {
    global: { plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })] },
  })
})

afterEach(() => {
  wrapper.unmount()
  vi.restoreAllMocks()
})

describe('PlanRequiredNotice.vue', () => {
  it('no se muestra hasta que llega un 403 por plan', () => {
    expect(wrapper.find('.plan-notice').exists()).toBe(false)
  })

  it('explica qué plan incluye el módulo y refresca el contexto', async () => {
    await emitir({ code: 'PLAN_FEATURE_REQUIRED', feature: 'teams', requiredPlan: 'pro' })
    expect(wrapper.text()).toContain('Este módulo no está en tu plan')
    expect(wrapper.text()).toContain('Equipos está incluido desde el plan Pro')
    expect(wrapper.find('a').attributes('href')).toBe('/billing')
    expect(store.loadAccessContext).toHaveBeenCalledOnce()
  })

  it('explica el tope alcanzado', async () => {
    await emitir({ code: 'PLAN_LIMIT_REACHED', resource: 'projects', limit: 2 })
    expect(wrapper.text()).toContain('Tu plan permite hasta 2 proyectos')
  })

  it('un recurso desconocido usa un mensaje genérico', async () => {
    await emitir({ code: 'PLAN_LIMIT_REACHED', resource: 'widgets', limit: 1 })
    expect(wrapper.text()).toContain('Tu plan no permite agregar más')
  })

  it('se cierra', async () => {
    await emitir({ code: 'PLAN_FEATURE_REQUIRED', feature: 'ai_agent', requiredPlan: 'business' })
    await wrapper.find('.pn-close').trigger('click')
    expect(wrapper.find('.plan-notice').exists()).toBe(false)
  })
})
