import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../src/services/http.js'
import { changePlan, getPlans, getSubscription, openPortal, startCheckout } from '../src/services/billing.js'

// PAY-1 — Servicio de suscripción y aviso global de 403 por plan.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  localStorage.setItem('token', 'session-token')
  localStorage.setItem('empresaActual', JSON.stringify({ id_empresa: 7 }))
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('services/billing', () => {
  it('el catálogo se pide sin sesión', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { testMode: true, plans: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getPlans()).resolves.toEqual({ testMode: true, plans: [] })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('la suscripción viaja con token y empresa activa', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { plan: 'free' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSubscription()).resolves.toEqual({ plan: 'free' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/billing\/subscription$/)
    expect(init.headers.Authorization).toBe('Bearer session-token')
    expect(init.headers['X-Company-ID']).toBe('7')
  })

  it('el checkout solo manda plan e intervalo y devuelve la URL hospedada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { url: 'https://checkout.stripe.com/c/x' } }, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(startCheckout({ plan: 'pro', interval: 'year' })).resolves.toBe('https://checkout.stripe.com/c/x')
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ plan: 'pro', interval: 'year' })
  })

  it('cambio de plan y portal', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json({ data: { plan: 'business', interval: 'month' } }, 202))
        .mockResolvedValueOnce(json({ data: { url: 'https://billing.stripe.com/p/x' } }, 201))
    )
    await expect(changePlan({ plan: 'business', interval: 'month' })).resolves.toMatchObject({ plan: 'business' })
    await expect(openPortal()).resolves.toBe('https://billing.stripe.com/p/x')
  })

  it('un error trae el mensaje, el status y el código del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: false, message: 'Already subscribed.' }, 409)))
    await expect(startCheckout({ plan: 'pro', interval: 'month' })).rejects.toMatchObject({
      message: 'Already subscribed.',
      status: 409,
    })
  })

  it('usa el primer error de validación si viene', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ message: 'Invalid data.', errors: [{ message: 'Plan must be one of' }] }, 400))
    )
    await expect(changePlan({ plan: 'x', interval: 'month' })).rejects.toThrow('Plan must be one of')
  })
})

describe('aviso global de plan (http.js)', () => {
  it('un 403 con código PLAN_* dispara api:plan-required sin consumir el cuerpo', async () => {
    const body = { success: false, code: 'PLAN_LIMIT_REACHED', resource: 'projects', limit: 2 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(body, 403)))
    const listener = vi.fn()
    window.addEventListener('api:plan-required', listener)

    const response = await apiFetch('/api/projects', { method: 'POST', body: '{}' })
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce())
    window.removeEventListener('api:plan-required', listener)

    expect(listener.mock.calls[0][0].detail).toMatchObject({ code: 'PLAN_LIMIT_REACHED', resource: 'projects' })
    await expect(response.json()).resolves.toEqual(body)
  })

  it('un 403 de permisos normal no dispara el aviso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: false, message: 'Forbidden' }, 403)))
    const listener = vi.fn()
    window.addEventListener('api:plan-required', listener)

    await apiFetch('/api/teams')
    await new Promise((resolve) => setTimeout(resolve, 0))
    window.removeEventListener('api:plan-required', listener)

    expect(listener).not.toHaveBeenCalled()
  })
})
