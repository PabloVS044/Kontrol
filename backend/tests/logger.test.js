import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger } from '../src/utils/logger.js'

/**
 * DT-11 — el registrador filtra por LOG_LEVEL y, sin él, por NODE_ENV.
 * Los argumentos llegan a console sin tocar.
 */
describe('DT-11 · logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('pasa los argumentos a console sin cambiarlos', () => {
    vi.stubEnv('LOG_LEVEL', 'debug')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    logger.error('[ctx]', err)
    expect(error).toHaveBeenCalledWith('[ctx]', err)
  })

  it('descarta los niveles por debajo de LOG_LEVEL', () => {
    vi.stubEnv('LOG_LEVEL', 'warn')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.debug('x')
    logger.info('x')
    logger.warn('x')
    expect(debug).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('silent no emite nada, ni siquiera errores', () => {
    vi.stubEnv('LOG_LEVEL', 'silent')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('x')
    expect(error).not.toHaveBeenCalled()
  })

  it('sin LOG_LEVEL, en producción oculta debug y muestra info', () => {
    vi.stubEnv('LOG_LEVEL', '')
    vi.stubEnv('NODE_ENV', 'production')
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.debug('x')
    logger.info('x')
    expect(debug).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledOnce()
  })
})
