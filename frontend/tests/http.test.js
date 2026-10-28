import { afterEach, describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { apiFetch as domainApiFetch } from '../src/services/api.js'
import { apiFetch, authHeaders, resolveApiUrl } from '../src/services/http.js'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('shared HTTP client', () => {
  it('resolves API paths through the configured base URL', () => {
    const path = '/api/projects'
    const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

    expect(resolveApiUrl(path)).toBe(baseUrl ? `${baseUrl}${path}` : path)
    expect(resolveApiUrl('https://example.com/api/projects')).toBe('https://example.com/api/projects')
  })

  it('centralizes token, company, and project headers', () => {
    localStorage.setItem('token', 'session-token')
    localStorage.setItem('empresaActual', JSON.stringify({ id_empresa: 42 }))

    const headers = authHeaders({ 'X-Trace-ID': 'trace-1' }, 19)

    expect(headers.Authorization).toBe('Bearer session-token')
    expect(headers['X-Company-ID']).toBe('42')
    expect(headers['X-Project-ID']).toBe('19')
    expect(headers['X-Trace-ID']).toBe('trace-1')
  })

  it('ignores a project id passed as the first argument, which is for extra headers', () => {
    // authHeaders(5) does not send X-Project-ID. The refactor to the shared
    // client left that shape in the inventory, and creating, editing or
    // deleting a product answered 400 "Select a project to continue.".
    expect(authHeaders(5)['X-Project-ID']).toBeUndefined()
    expect(authHeaders({}, { projectId: 5 })['X-Project-ID']).toBe('5')
  })

  it('no view passes a bare project id as the extra headers argument', () => {
    const root = resolve(__dirname, '../src')
    const llamada = /authHeaders\(\s*(?!\)|\{)[^,()]*(?:\([^()]*\))?\s*\)/
    const infractores = readdirSync(root, { recursive: true })
      .map((ruta) => String(ruta).replaceAll('\\', '/'))
      .filter((ruta) => /\.(js|vue)$/.test(ruta))
      .filter((ruta) => llamada.test(readFileSync(join(root, ruta), 'utf8')))

    expect(infractores).toEqual([])
  })

  it('retries a transient GET response once', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('{"data":[]}'))
    vi.stubGlobal('fetch', fetchMock)

    const response = await apiFetch('/api/projects')

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-idempotent requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/projects', { method: 'POST', body: '{}' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('routes a domain request through its domain service and the shared client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"data":[]}'))
    vi.stubGlobal('fetch', fetchMock)

    await domainApiFetch('/api/projects')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe(resolveApiUrl('/api/projects'))
  })

  it('rejects paths without a registered domain service', () => {
    expect(() => domainApiFetch('/api/unknown/resource')).toThrow(
      'No API service is registered for unknown'
    )
  })

  it('clears an expired token and emits the centralized unauthorized event', async () => {
    localStorage.setItem('token', 'expired-token')
    const listener = vi.fn()
    window.addEventListener('api:unauthorized', listener)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))

    await apiFetch('/api/private')

    expect(localStorage.getItem('token')).toBeNull()
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0].detail.url).toBe(resolveApiUrl('/api/private'))

    window.removeEventListener('api:unauthorized', listener)
  })
})
