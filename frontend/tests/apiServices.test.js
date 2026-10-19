import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as agent from '@/services/agent.js'
import * as integrations from '@/services/integrations.js'
import * as marketing from '@/services/marketing.js'

/** Respuesta mínima con la superficie que usan los servicios. */
function respond({ status = 200, body = {}, badJson = false } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (badJson ? Promise.reject(new SyntaxError('bad json')) : Promise.resolve(body)),
  }
}

let fetchMock
function mockFetch(...responses) {
  fetchMock = vi.fn()
  for (const r of responses) fetchMock.mockResolvedValueOnce(r)
  vi.stubGlobal('fetch', fetchMock)
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('services/agent', () => {
  it('manda token y empresa activa en las cabeceras', async () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('empresaActual', JSON.stringify({ id_empresa: 9 }))
    mockFetch(respond({ body: { data: [] } }))

    await agent.listConversations()

    expect(fetchMock).toHaveBeenCalledWith('/api/agent/conversations', {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt', 'X-Company-ID': '9' },
    })
  })

  it('ignora una empresa guardada corrupta o sin id', async () => {
    localStorage.setItem('empresaActual', '{no-json')
    mockFetch(respond({ body: { data: [] } }), respond({ body: { data: [] } }))
    await agent.listConversations()
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' })

    localStorage.setItem('empresaActual', JSON.stringify({ nombre: 'sin id' }))
    await agent.listConversations()
    expect(fetchMock.mock.calls[1][1].headers['X-Company-ID']).toBeUndefined()
  })

  describe('fetchAgentStatus', () => {
    it('devuelve el estado del backend', async () => {
      mockFetch(respond({ body: { data: { configured: true, persistence: true } } }))
      expect(await agent.fetchAgentStatus()).toEqual({ configured: true, persistence: true })
    })

    it('cae a no configurado ante error HTTP, cuerpo sin data o fallo de red', async () => {
      const off = { configured: false, persistence: false }
      mockFetch(respond({ status: 503 }), respond({ body: {} }))
      expect(await agent.fetchAgentStatus()).toEqual(off)
      expect(await agent.fetchAgentStatus()).toEqual(off)

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red')))
      expect(await agent.fetchAgentStatus()).toEqual(off)
    })
  })

  describe('sendAgentMessage', () => {
    it('incluye conversationId solo si viene y pasa la señal de aborto', async () => {
      const signal = new AbortController().signal
      mockFetch(respond({ body: { data: { answer: 'hola' } } }), respond({ body: { data: {} } }))

      expect(await agent.sendAgentMessage([{ role: 'user', content: 'x' }], { conversationId: 'c1', signal })).toEqual({ answer: 'hola' })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/agent/chat')
      expect(init.method).toBe('POST')
      expect(init.signal).toBe(signal)
      expect(JSON.parse(init.body)).toEqual({ messages: [{ role: 'user', content: 'x' }], conversationId: 'c1' })

      await agent.sendAgentMessage([])
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ messages: [] })
    })

    it('lanza el mensaje del backend, o uno genérico si el cuerpo no es JSON', async () => {
      mockFetch(respond({ status: 400, body: { message: 'Falta el mensaje' } }), respond({ status: 502, badJson: true }))
      await expect(agent.sendAgentMessage([])).rejects.toThrow('Falta el mensaje')
      await expect(agent.sendAgentMessage([])).rejects.toThrow('Request failed (502)')
    })
  })

  it('codifica los ids en la URL de conversaciones y mensajes', async () => {
    mockFetch(
      respond({ body: { data: { messages: [] } } }),
      respond({ body: {} }),
      respond({ body: { data: { id: 'm/1' } } }),
      respond({ body: {} })
    )

    expect(await agent.loadConversation('a/b')).toEqual({ messages: [] })
    await agent.deleteConversation('a/b')
    expect(await agent.editAgentMessage('m/1', 'nuevo')).toEqual({ id: 'm/1' })
    await agent.deleteAgentMessage('m/1')

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ['/api/agent/conversations/a%2Fb/messages', undefined],
      ['/api/agent/conversations/a%2Fb', 'DELETE'],
      ['/api/agent/messages/m%2F1', 'PATCH'],
      ['/api/agent/messages/m%2F1', 'DELETE'],
    ])
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ content: 'nuevo' })
  })

  it('las operaciones de borrado propagan el error del backend', async () => {
    mockFetch(respond({ status: 404, body: { message: 'No existe' } }), respond({ status: 403, body: {} }))
    await expect(agent.deleteConversation('x')).rejects.toThrow('No existe')
    await expect(agent.deleteAgentMessage('x')).rejects.toThrow('Request failed (403)')
  })
})

describe('services/integrations', () => {
  const expectedHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer t', 'X-Company-ID': '2' }

  it('cada operación usa su ruta, método y cabeceras', async () => {
    mockFetch(
      respond({ body: { data: ['slack'] } }),
      respond({ body: { data: { slug: 'slack' } } }),
      respond({ body: { ok: true } }),
      respond({ body: { data: { status: 'active' } } }),
      respond({ body: { success: true } }),
      respond({ status: 204 })
    )

    expect(await integrations.listIntegrations('t', 2)).toEqual(['slack'])
    expect(await integrations.getIntegrationConfig('t', 2, 'slack')).toEqual({ slug: 'slack' })
    expect(await integrations.saveIntegrationConfig('t', 2, 'slack', { credentials: { k: 1 }, config: { c: 2 } })).toEqual({ ok: true })
    expect(await integrations.toggleIntegration('t', 2, 'slack', 'active')).toEqual({ status: 'active' })
    expect(await integrations.testIntegration('t', 2, 'slack')).toEqual({ success: true })
    expect(await integrations.deleteIntegrationConfig('t', 2, 'slack')).toBeUndefined()

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method ?? 'GET'])).toEqual([
      ['/api/integrations', 'GET'],
      ['/api/integrations/slack', 'GET'],
      ['/api/integrations/slack', 'PUT'],
      ['/api/integrations/slack/toggle', 'PATCH'],
      ['/api/integrations/slack/test', 'POST'],
      ['/api/integrations/slack', 'DELETE'],
    ])
    for (const [, init] of fetchMock.mock.calls) expect(init.headers).toEqual(expectedHeaders)
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ credentials: { k: 1 }, config: { c: 2 } })
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ status: 'active' })
  })

  it('propaga el mensaje del backend o el código HTTP en cada operación', async () => {
    const fail = (message) => respond({ status: 400, body: message ? { message } : {} })
    mockFetch(fail('a'), fail(), fail('c'), fail(), fail('e'), fail('f'), respond({ status: 500, badJson: true }))

    await expect(integrations.listIntegrations('t', 1)).rejects.toThrow('a')
    await expect(integrations.getIntegrationConfig('t', 1, 's')).rejects.toThrow('HTTP 400')
    await expect(integrations.saveIntegrationConfig('t', 1, 's', {})).rejects.toThrow('c')
    await expect(integrations.toggleIntegration('t', 1, 's', 'x')).rejects.toThrow('HTTP 400')
    await expect(integrations.testIntegration('t', 1, 's')).rejects.toThrow('e')
    await expect(integrations.deleteIntegrationConfig('t', 1, 's')).rejects.toThrow('f')
    await expect(integrations.deleteIntegrationConfig('t', 1, 's')).rejects.toThrow('HTTP 500')
  })
})

describe('services/marketing', () => {
  it('listPublications omite filtros vacíos y aplica valores por defecto', async () => {
    mockFetch(
      respond({ body: { data: [{ id: 1 }], capabilities: { canManageMarketing: true } } }),
      respond({ body: {} })
    )

    expect(
      await marketing.listPublications('t', 3, { status: 'DRAFT', platform: '', projectId: null, extra: undefined })
    ).toEqual({ data: [{ id: 1 }], capabilities: { canManageMarketing: true } })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/marketing/publications?status=DRAFT')

    expect(await marketing.listPublications('t', 3)).toEqual({ data: [], capabilities: { canManageMarketing: false } })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/marketing/publications')
  })

  it('crea, actualiza, borra y lista proyectos con sus rutas y métodos', async () => {
    mockFetch(
      respond({ body: { data: { id: 5 } } }),
      respond({ body: { data: { id: 5, title: 'b' } } }),
      respond({ body: {} }),
      respond({ body: { data: [{ id_proyecto: 2 }] } }),
      respond({ body: {} })
    )

    expect(await marketing.createPublication('t', 1, { title: 'a' })).toEqual({ id: 5 })
    expect(await marketing.updatePublication('t', 1, 5, { title: 'b' })).toEqual({ id: 5, title: 'b' })
    expect(await marketing.deletePublication('t', 1, 5)).toBeUndefined()
    expect(await marketing.listProjectsForPublications('t', 1)).toEqual([{ id_proyecto: 2 }])
    expect(await marketing.listProjectsForPublications('t', 1)).toEqual([])

    expect(fetchMock.mock.calls.slice(0, 4).map(([url, init]) => [url, init.method ?? 'GET'])).toEqual([
      ['/api/marketing/publications', 'POST'],
      ['/api/marketing/publications/5', 'PUT'],
      ['/api/marketing/publications/5', 'DELETE'],
      ['/api/projects', 'GET'],
    ])
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer t',
      'X-Company-ID': '1',
    })
  })

  it('propaga el error del backend', async () => {
    mockFetch(respond({ status: 403, body: { message: 'Sin permiso' } }), respond({ status: 500, body: {} }))
    await expect(marketing.createPublication('t', 1, {})).rejects.toThrow('Sin permiso')
    await expect(marketing.deletePublication('t', 1, 1)).rejects.toThrow('HTTP 500')
  })
})
