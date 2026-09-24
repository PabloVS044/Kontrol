import { Router } from 'express'

/**
 * DT-01 · Envoltorio para handlers y middlewares async.
 *
 * Express 4 ignora la promesa que devuelve un handler: si se rechaza, nadie
 * la captura y Node 20+ termina el proceso por `unhandledRejection`. Esto la
 * encadena a `next(err)` para que llegue al middleware central de errores.
 *
 * Respeta la aridad: un middleware de errores `(err, req, res, next)` sigue
 * teniendo cuatro parámetros, que es como Express lo reconoce.
 */
export function asyncHandler(fn) {
  if (fn.length === 4) {
    return function asyncErrorMiddleware(err, req, res, next) {
      return Promise.resolve(fn(err, req, res, next)).catch(next)
    }
  }
  return function asyncMiddleware(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Un sub-router montado con `router.use()` ya gestiona sus propios errores.
const isRouter = (fn) => typeof fn.handle === 'function' && Array.isArray(fn.stack)

function wrapArg(arg) {
  if (Array.isArray(arg)) return arg.map(wrapArg)
  if (typeof arg === 'function' && !isRouter(arg)) return asyncHandler(arg)
  return arg
}

const WRAPPED_METHODS = ['use', 'all', 'get', 'post', 'put', 'patch', 'delete']

/**
 * `Router()` de Express con `asyncHandler` aplicado a cada handler y
 * middleware que se registre. Se usa en lugar de `Router()` en todos los
 * archivos de rutas, de modo que ningún handler nuevo pueda olvidarse de
 * envolverse.
 */
export function createRouter(options) {
  const router = Router(options)
  for (const method of WRAPPED_METHODS) {
    const original = router[method].bind(router)
    router[method] = (...args) => original(...args.map(wrapArg))
  }
  return router
}
