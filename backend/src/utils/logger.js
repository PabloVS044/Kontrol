// Thin wrapper over console with a configurable threshold (LOG_LEVEL).
// Arguments pass through untouched, so container logs read the same as
// before and tests that spy on console keep working.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 50 }

function threshold() {
  const configured = LEVELS[process.env.LOG_LEVEL?.toLowerCase()]
  if (configured !== undefined) return configured
  return process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug
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
