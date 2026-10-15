/**
 * Thin wrapper over console with a configurable threshold (VITE_LOG_LEVEL).
 * Defaults to warn in production builds and debug otherwise. Arguments pass
 * through untouched, so devtools output and console spies in tests behave as
 * before.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 50 }

function threshold() {
  const configured = LEVELS[import.meta.env.VITE_LOG_LEVEL?.toLowerCase()]
  if (configured !== undefined) return configured
  return import.meta.env.PROD ? LEVELS.warn : LEVELS.debug
}

function emit(level, method) {
  return (...args) => {
    if (LEVELS[level] >= threshold()) console[method](...args)
  }
}

export const logger = {
  debug: emit('debug', 'debug'),
  info: emit('info', 'log'),
  warn: emit('warn', 'warn'),
  error: emit('error', 'error'),
}
