/**
 * DT-01 · Middleware central de errores. Se registra al final de la cadena
 * en `index.js` y recibe todo error que un handler pase a `next(err)`,
 * incluidos los rechazos que `asyncHandler` encadena.
 *
 * Mantiene el contrato de error de la API: `{ success: false, message }`.
 * Nunca expone el mensaje ni el stack de un error 5xx; ese detalle solo va
 * al log del servidor.
 */

// Errores de Postgres que llegan sin que el controlador los maneje. Son
// conflictos de datos provocados por la petición, no fallos del servidor.
const PG_ERRORS = {
  23503: { status: 409, message: 'The operation references data that does not exist or is still in use.' },
  23505: { status: 409, message: 'A record with the same unique value already exists.' },
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Si la respuesta ya empezó a enviarse, solo Express puede cortarla.
  if (res.headersSent) return next(err)

  const pgError = PG_ERRORS[err?.code]
  if (pgError) {
    return res.status(pgError.status).json({ success: false, message: pgError.message })
  }

  // Errores con status propio: los que lanzan los controladores con
  // `error.status` y los de body-parser (JSON mal formado, cuerpo enorme).
  const status = err?.status ?? err?.statusCode
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return res.status(status).json({ success: false, message: err.message })
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, err)
  return res.status(500).json({ success: false, message: 'Internal server error.' })
}
