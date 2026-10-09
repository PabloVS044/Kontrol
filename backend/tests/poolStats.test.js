import { describe, it, expect, vi, afterEach } from 'vitest'
import pg from 'pg'
import request from 'supertest'
import express from 'express'
import { getPoolStats, startPoolStatsLogger, resolveStatsIntervalMs } from '../src/db/poolStats.js'

/**
 * DT-15 — cierra el pendiente de SCRUM-28: totalCount y waitingCount.
 *
 * Se usa un `pg.Pool` real con `max: 1` y un cliente falso que conecta sin
 * red, para que los contadores sean los que calcula `pg` y no un mock.
 */
class FakeClient extends pg.Client {
  connect(cb) {
    this._connected = true
    if (cb) return process.nextTick(cb)
    return Promise.resolve()
  }
  query() { return Promise.resolve({ rows: [] }) }
  end(cb) { if (cb) process.nextTick(cb); return Promise.resolve() }
}

const realPool = (max = 1) => new pg.Pool({ Client: FakeClient, max })

afterEach(() => {
  vi.useRealTimers()
})

describe('DT-15 · getPoolStats', () => {
  it('lee total, idle, waiting y max del pool real de pg', async () => {
    const pool = realPool(1)
    expect(getPoolStats(pool)).toEqual({ total: 0, idle: 0, waiting: 0, max: 1 })

    const held = await pool.connect()
    const pending = pool.connect() // max = 1: queda en cola
    expect(getPoolStats(pool)).toEqual({ total: 1, idle: 0, waiting: 1, max: 1 })

    held.release()
    const second = await pending
    expect(getPoolStats(pool)).toMatchObject({ total: 1, waiting: 0 })

    second.release()
    expect(getPoolStats(pool)).toMatchObject({ total: 1, idle: 1, waiting: 0 })
    await pool.end()
  })
})

describe('DT-15 · /api/health', () => {
  it('incluye los contadores del pool', async () => {
    vi.resetModules()
    vi.doMock('../src/db/pool.js', () => ({
      default: { totalCount: 4, idleCount: 1, waitingCount: 2, options: { max: 10 } },
    }))
    const { default: router } = await import('../src/router.js')
    const app = express().use('/api', router)

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', db: { total: 4, idle: 1, waiting: 2, max: 10 } })
    vi.doUnmock('../src/db/pool.js')
  })
})

describe('DT-15 · startPoolStatsLogger', () => {
  const pool = { totalCount: 3, idleCount: 0, waitingCount: 5, options: { max: 3 } }

  it('apagado por defecto', () => {
    vi.useFakeTimers()
    const log = vi.fn()
    startPoolStatsLogger(pool, resolveStatsIntervalMs({}), log)
    vi.advanceTimersByTime(60_000)
    expect(log).not.toHaveBeenCalled()
  })

  it('emite una línea JSON por intervalo y se puede detener', () => {
    vi.useFakeTimers()
    const log = vi.fn()
    const stop = startPoolStatsLogger(pool, resolveStatsIntervalMs({ DB_POOL_STATS_INTERVAL_MS: '1000' }), log)

    vi.advanceTimersByTime(2_000)
    expect(log).toHaveBeenCalledTimes(2)
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      event: 'db_pool_stats', total: 3, idle: 0, waiting: 5, max: 3,
    })

    stop()
    vi.advanceTimersByTime(5_000)
    expect(log).toHaveBeenCalledTimes(2)
  })

  it.each(['', 'abc', '0', '-1'])('ignora el intervalo inválido %j', (value) => {
    expect(resolveStatsIntervalMs({ DB_POOL_STATS_INTERVAL_MS: value })).toBe(0)
  })
})
