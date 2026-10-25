import { beforeEach, describe, expect, it, vi } from 'vitest'

const { conversationFind, messageFind, agentConversationFind, agentMessageFind } = vi.hoisted(() => ({
  conversationFind: vi.fn(),
  messageFind: vi.fn(),
  agentConversationFind: vi.fn(),
  agentMessageFind: vi.fn(),
}))

vi.mock('../src/models/Conversation.js', () => ({ default: { find: conversationFind } }))
vi.mock('../src/models/Message.js', () => ({ default: { find: messageFind } }))
vi.mock('../src/models/AgentConversation.js', () => ({ default: { find: agentConversationFind } }))
vi.mock('../src/models/AgentMessage.js', () => ({ default: { find: agentMessageFind } }))

import { buildCompanyTableScopes, prepareCompanyDataExport } from '../src/services/companyDataExport.js'

async function* emptyCursor() {}

const emptyModelQuery = () => ({ lean: () => ({ cursor: emptyCursor }) })

describe('company data export scopes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    conversationFind.mockReturnValue(emptyModelQuery())
    messageFind.mockReturnValue({ lean: () => ({ cursor: emptyCursor }) })
    agentConversationFind.mockReturnValue(emptyModelQuery())
    agentMessageFind.mockReturnValue(emptyModelQuery())
  })

  it('follows foreign keys downward without including another user or unrelated tenant', () => {
    const tables = [
      { name: 'empresa', columns: ['id_empresa'] },
      { name: 'proyecto', columns: ['id_proyecto', 'id_empresa'] },
      { name: 'tarea', columns: ['id_tarea', 'id_proyecto'] },
      { name: 'evidencia', columns: ['id_evidencia', 'id_tarea', 'id_usuario'] },
      { name: 'usuario', columns: ['id_usuario', 'password_hash'] },
      { name: 'global_audit', columns: ['id_audit'] },
    ]
    const foreignKeys = [
      { parent: 'proyecto', child: 'tarea', parentColumns: ['id_proyecto'], childColumns: ['id_proyecto'] },
      { parent: 'tarea', child: 'evidencia', parentColumns: ['id_tarea'], childColumns: ['id_tarea'] },
      { parent: 'usuario', child: 'evidencia', parentColumns: ['id_usuario'], childColumns: ['id_usuario'] },
    ]

    const scopes = buildCompanyTableScopes(tables, foreignKeys)

    expect([...scopes.keys()].sort()).toEqual(['empresa', 'evidencia', 'proyecto', 'tarea'])
    expect(scopes.has('usuario')).toBe(false)
    expect(scopes.has('global_audit')).toBe(false)
  })

  it('streams valid JSON scoped to the company without exposing sensitive fields', async () => {
    conversationFind.mockReturnValue({
      lean: () => ({
        cursor: async function* () {
          yield {
            _id: 'conversation-1',
            createdAt: '2026-10-22T10:00:00.000Z',
            updatedAt: '2026-10-22T11:00:00.000Z',
            participants: [7, 8],
            participantInfo: [{ id: 8, email: 'other@example.test' }],
            lastMessage: { text: 'message from another user' },
          }
        },
      }),
    })
    messageFind.mockImplementation((filter) => {
      expect(filter).toEqual({ conversationId: 'conversation-1', senderId: 7 })
      return {
        lean: () => ({
          cursor: async function* () {
            yield { _id: 'message-1', senderId: 7, text: 'message from the exporter' }
          },
        }),
      }
    })

    const client = {
      query: vi.fn(async (sql, params = []) => {
        if (sql.includes('FROM pg_class c')) {
          return {
            rows: [
              { name: 'empresa', columns: ['id_empresa', 'nombre'] },
              { name: 'evidencia', columns: ['id_evidencia', 'id_tarea', 'id_usuario'] },
              { name: 'producto', columns: ['id_producto', 'id_proyecto', 'api_key'] },
              { name: 'proyecto', columns: ['id_proyecto', 'id_empresa'] },
              { name: 'tarea', columns: ['id_tarea', 'id_proyecto'] },
              { name: 'usuario', columns: ['id_usuario', 'password_hash'] },
            ],
          }
        }
        if (sql.includes('FROM pg_constraint constraint_row')) {
          return {
            rows: [
              {
                child: 'producto',
                parent: 'proyecto',
                childColumns: ['id_proyecto'],
                parentColumns: ['id_proyecto'],
              },
              {
                child: 'tarea',
                parent: 'proyecto',
                childColumns: ['id_proyecto'],
                parentColumns: ['id_proyecto'],
              },
              {
                child: 'evidencia',
                parent: 'tarea',
                childColumns: ['id_tarea'],
                parentColumns: ['id_tarea'],
              },
              {
                child: 'evidencia',
                parent: 'usuario',
                childColumns: ['id_usuario'],
                parentColumns: ['id_usuario'],
              },
            ],
          }
        }
        if (sql.includes('FROM public.usuario')) {
          return { rows: [{ id_usuario: 7, nombre: 'Sara', email: 'sara@example.test' }] }
        }
        if (sql.includes('to_jsonb(t)')) {
          if (params[1]) return { rows: [] }
          if (sql.includes('FROM public."empresa" t')) {
            return { rows: [{ row: { id_empresa: 3, nombre: 'Negocio' }, cursor: '(0,1)' }] }
          }
          if (sql.includes('FROM public."proyecto" t')) {
            return { rows: [{ row: { id_proyecto: 9, id_empresa: 3 }, cursor: '(0,2)' }] }
          }
          if (sql.includes('FROM public."producto" t')) {
            return { rows: [{ row: { id_producto: 11, id_proyecto: 9, api_key: 'must-not-export' }, cursor: '(0,3)' }] }
          }
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      }),
      release: vi.fn(),
    }

    const stream = await prepareCompanyDataExport(client, { companyId: 3, userId: 7 })
    let output = ''
    for await (const chunk of stream) output += chunk

    const document = JSON.parse(output)
    expect(document.profile).toEqual({ id_usuario: 7, nombre: 'Sara', email: 'sara@example.test' })
    expect(document.tables.empresa).toEqual([{ id_empresa: 3, nombre: 'Negocio' }])
    expect(document.tables.proyecto).toEqual([{ id_proyecto: 9, id_empresa: 3 }])
    expect(document.tables.producto).toEqual([{ id_producto: 11, id_proyecto: 9 }])
    expect(document.tables.evidencia).toEqual([])
    expect(output).not.toContain('must-not-export')
    expect(document.conversations).toEqual({
      assistant_conversations: [],
      assistant_messages: [],
      human_conversations: [{
        conversation: {
          id: 'conversation-1',
          createdAt: '2026-10-22T10:00:00.000Z',
          updatedAt: '2026-10-22T11:00:00.000Z',
        },
        messages: [{ _id: 'message-1', senderId: 7, text: 'message from the exporter' }],
      }],
    })
    expect(output).not.toContain('other@example.test')
    expect(output).not.toContain('message from another user')
    expect(client.release).not.toHaveBeenCalled()
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK')
    const evidenceQuery = client.query.mock.calls.find(([sql]) =>
      sql.includes('FROM public."evidencia" t')
    )[0]
    expect(evidenceQuery).toContain('public."tarea" scope_parent_0')
    expect(evidenceQuery).toContain('public."proyecto" scope_parent_1')
  })
})
