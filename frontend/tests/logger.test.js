import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger } from '../src/utils/logger.js'

/**
 * DT-11 — el registrador filtra por VITE_LOG_LEVEL y, sin él, deja pasar
 * solo warn y error en el build de producción.
 */
describe('DT-11 · logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('pasa los argumentos a console sin cambiarlos', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'debug')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    logger.error('[ctx]', err)
    expect(error).toHaveBeenCalledWith('[ctx]', err)
  })

  it('descarta los niveles por debajo de VITE_LOG_LEVEL', () => {
    vi.stubEnv('VITE_LOG_LEVEL', 'error')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.warn('x')
    logger.error('x')
    expect(warn).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledOnce()
  })

  it('sin VITE_LOG_LEVEL, en producción oculta info y muestra warn', () => {
    vi.stubEnv('VITE_LOG_LEVEL', '')
    vi.stubEnv('PROD', true)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.info('x')
    logger.warn('x')
    expect(log).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })
})
