// PAY-1 — Errores del módulo de pagos. Llevan `status` para que el
// errorHandler central responda 4xx/5xx con el contrato habitual.

export class BillingNotConfiguredError extends Error {
  constructor(message = 'Billing is not configured on this server.') {
    super(message)
    this.status = 503
  }
}

export class InvalidBillingEventError extends Error {
  constructor(message = 'Invalid billing event signature.') {
    super(message)
    this.status = 400
  }
}
