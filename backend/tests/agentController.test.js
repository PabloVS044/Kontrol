import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({
  default: { query: vi.fn() },
}))

vi.mock('../src/db/mongo.js', () => ({ isMongoReady: vi.fn(() => false) }))

vi.mock('../src/services/aiAgentService.js', () => ({
  isAgentConfigured: vi.fn(() => true),
  runAgentTurn: vi.fn(),
}))

import express from 'express'
import request from 'supertest'
import pool from '../src/db/pool.js'
import agentRoutes from '../src/routes/agentRoutes.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import { runAgentTurn } from '../src/services/aiAgentService.js'
import { signToken, companyMembership } from './helpers/authTestApp.js'

const app = express()
app.use(express.json())
app.use('/api/agent', agentRoutes)
app.use(errorHandler)

const chat = () =>
  request(app)
    .post('/api/agent/chat')
    .set('Authorization', `Bearer ${signToken()}`)
    .set('X-Company-ID', '1')
    .send({ messages: [{ role: 'user', content: '¿Cómo van mis proyectos?' }] })

beforeEach(() => {
  vi.clearAllMocks()
  pool.query.mockResolvedValue(companyMembership('owner'))
})

describe('POST /api/agent/chat', () => {
  /**
   * Regresión: el abort escuchaba `req.on('close')`, que en Node ≥16 se
   * dispara al terminar de leer el body. Sin Mongo no hay ningún await antes
   * de registrarlo, así que cada turno se abortaba al instante y la petición
   * quedaba colgada sin respuesta.
   */
  it('no aborta el turno mientras el cliente sigue conectado', async () => {
    let abortedDuringTurn = null
    runAgentTurn.mockImplementation(async ({ signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      abortedDuringTurn = signal.aborted
      return { answer: 'Todo en orden.', queries: [] }
    })

    const res = await chat()

    expect(res.status).toBe(200)
    expect(res.body.data.answer).toBe('Todo en orden.')
    expect(abortedDuringTurn).toBe(false)
  })

  it('no devuelve al cliente el detalle del error del servidor de inferencia', async () => {
    runAgentTurn.mockRejectedValue(new Error('AI inference server returned 401: {"detail":"bad token sk-123"}'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await chat()

    expect(res.status).toBe(500)
    expect(res.body.message).not.toMatch(/401|sk-123/)
  })
})
