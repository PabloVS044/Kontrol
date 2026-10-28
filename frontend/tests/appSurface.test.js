import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import router from '@/router/index.js'
import AppSurface from '@/components/UI/AppSurface/AppSurface.vue'

// DT-09 / T-18: una sola capa de contraste sobre el fondo animado para todas
// las vistas internas, en lugar de que cada vista pinte (o no) su propio velo.

describe('AppSurface', () => {
  it('pinta el velo solo cuando está activa', () => {
    const activa = mount(AppSurface, { props: { active: true }, slots: { default: '<p>x</p>' } })
    expect(activa.find('.app-surface__scrim').exists()).toBe(true)
    expect(activa.find('p').exists()).toBe(true)

    const inactiva = mount(AppSurface, { props: { active: false }, slots: { default: '<p>x</p>' } })
    expect(inactiva.find('.app-surface__scrim').exists()).toBe(false)
    expect(inactiva.find('p').exists()).toBe(true)
  })

  it('con block pinta el velo en el propio bloque, no fijo a la pantalla', () => {
    const bloque = mount(AppSurface, { props: { block: true, active: true }, slots: { default: '<p>x</p>' } })
    expect(bloque.classes()).toContain('app-surface--block')
    expect(bloque.find('.app-surface__scrim').exists()).toBe(false)
    expect(bloque.find('p').exists()).toBe(true)
  })

  it('usa el token del velo', () => {
    const sfc = readFileSync(
      resolve(__dirname, '../src/components/UI/AppSurface/AppSurface.vue'),
      'utf8',
    )
    expect(sfc).toMatch(/background:\s*var\(--k-surface-scrim\)/)
    expect(sfc).toMatch(/background:\s*var\(--k-surface-panel\)/)
  })
})

describe('router — meta.surface', () => {
  const publicas = ['landing', 'login', 'register', 'auth-callback', 'onboarding', 'invite']

  it('las vistas públicas muestran el fondo animado sin velo', () => {
    for (const name of publicas) {
      expect(router.getRoutes().find((r) => r.name === name)?.meta.surface, name).toBeFalsy()
    }
  })

  it('toda vista que exige sesión, salvo onboarding, va sobre AppSurface', () => {
    const internas = router
      .getRoutes()
      .filter((r) => r.meta.requiresAuth && r.name !== 'onboarding' && r.components)
    expect(internas.length).toBeGreaterThan(10)
    for (const r of internas) expect(r.meta.surface, r.name ?? r.path).toBe(true)
  })
})

describe('vistas públicas con texto sobre el fondo animado', () => {
  for (const vista of ['OnboardingView', 'NotFoundView']) {
    it(`${vista} envuelve su bloque de texto en AppSurface block`, () => {
      const sfc = readFileSync(resolve(__dirname, `../src/views/${vista}.vue`), 'utf8')
      expect(sfc).toMatch(/<AppSurface block\b/)
    })
  }
})
