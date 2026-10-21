import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// googleAuth y la rama de error de googleCallback no tocan Postgres, pero el
// controller importa el pool al cargar.
vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import { getFrontendBaseUrl, matchAllowedFrontendUrl } from '../src/utils/frontendUrl.js'
import { googleAuth, googleCallback } from '../src/controllers/authController.js'

const VERCEL = 'https://kontrol.vercel.app'
const DOMAIN = 'https://kontrol.example'

function fakeReq({ headers = {}, query = {} } = {}) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  )
  return { query, protocol: 'https', get: (name) => lower[name.toLowerCase()] }
}

function fakeRes() {
  return { redirect: vi.fn() }
}

const stateOf = (googleUrl) => new URL(googleUrl).searchParams.get('state')

let savedFrontendUrl

beforeEach(() => {
  savedFrontendUrl = process.env.FRONTEND_URL
  process.env.FRONTEND_URL = `${VERCEL}, ${DOMAIN}`
})

afterEach(() => {
  if (savedFrontendUrl === undefined) delete process.env.FRONTEND_URL
  else process.env.FRONTEND_URL = savedFrontendUrl
})

describe('getFrontendBaseUrl con varios frontends', () => {
  it('usa el Origin de la petición si está en FRONTEND_URL', () => {
    const req = fakeReq({ headers: { Origin: DOMAIN } })
    expect(getFrontendBaseUrl(req)).toBe(DOMAIN)
  })

  it('usa el origen del Referer cuando no hay Origin', () => {
    const req = fakeReq({ headers: { Referer: `${DOMAIN}/login?x=1` } })
    expect(getFrontendBaseUrl(req)).toBe(DOMAIN)
  })

  it('prefiere el valor explícito sobre el Origin', () => {
    const req = fakeReq({ headers: { Origin: VERCEL } })
    expect(getFrontendBaseUrl(req, DOMAIN)).toBe(DOMAIN)
  })

  it('cae en la primera entrada si nada coincide', () => {
    const req = fakeReq({ headers: { Origin: 'https://evil.example' } })
    expect(getFrontendBaseUrl(req, 'https://evil.example')).toBe(VERCEL)
  })

  it('nunca devuelve la lista entera pegada por comas', () => {
    expect(getFrontendBaseUrl(fakeReq())).toBe(VERCEL)
  })

  it('con una sola URL se comporta como antes', () => {
    process.env.FRONTEND_URL = `${DOMAIN}/`
    expect(getFrontendBaseUrl(fakeReq({ headers: { Origin: VERCEL } }))).toBe(DOMAIN)
  })
})

describe('matchAllowedFrontendUrl', () => {
  it('rechaza orígenes fuera de la lista y valores que no son URL', () => {
    expect(matchAllowedFrontendUrl('https://kontrol.example.evil.com')).toBeNull()
    expect(matchAllowedFrontendUrl('http://kontrol.example')).toBeNull()
    expect(matchAllowedFrontendUrl('no-es-url')).toBeNull()
    expect(matchAllowedFrontendUrl(undefined)).toBeNull()
  })
})

describe('Google OAuth vuelve al frontend que inició el login', () => {
  it('guarda el return_to permitido en el state', () => {
    const res = fakeRes()
    googleAuth(fakeReq({ query: { return_to: DOMAIN, invite: 'inv-1' } }), res)

    const state = JSON.parse(
      Buffer.from(stateOf(res.redirect.mock.calls[0][0]), 'base64url').toString()
    )
    expect(state).toEqual({ inviteToken: 'inv-1', frontend: DOMAIN })
  })

  it('el callback redirige al frontend guardado en el state', async () => {
    const authRes = fakeRes()
    googleAuth(fakeReq({ query: { return_to: DOMAIN } }), authRes)
    const state = stateOf(authRes.redirect.mock.calls[0][0])

    const res = fakeRes()
    await googleCallback(fakeReq({ query: { error: 'access_denied', state } }), res)
    expect(res.redirect).toHaveBeenCalledWith(`${DOMAIN}/login?error=google_cancelado`)
  })

  it('un state manipulado no sirve de redirección abierta', async () => {
    const state = Buffer.from(JSON.stringify({ frontend: 'https://evil.example' }))
      .toString('base64url')

    const res = fakeRes()
    await googleCallback(fakeReq({ query: { error: 'access_denied', state } }), res)
    expect(res.redirect).toHaveBeenCalledWith(`${VERCEL}/login?error=google_cancelado`)
  })
})
