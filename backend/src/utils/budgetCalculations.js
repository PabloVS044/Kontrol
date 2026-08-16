// Pure budget math: accumulated spending, budget usage and overrun alerts.
// Kept free of DB access so the money-critical rules can be tested directly
// and reused by any controller that needs the same semantics.

// ── Alert levels ─────────────────────────────────────────────────────────────
// Granular thresholds let the UI surface a richer signal than just "warning".
export const ALERT_LEVELS = {
  SALUDABLE:   { threshold: 0,      message: 'Budget on track.' },
  PRECAUCION:  { threshold: 0.6,    message: '60% of the budget has been used. Monitor spending.' },
  ADVERTENCIA: { threshold: 0.8,    message: 'More than 80% of the budget has been used.' },
  CRITICO:     { threshold: 1.0,    message: 'The project budget has been fully consumed.' },
  EXCEDIDO:    { threshold: 1.0001, message: 'Spending has exceeded the allocated budget.' },
}

// Money is rounded to cents on every aggregation so float noise never leaks
// into a total the user sees or compares against the budget.
const CENTS = 2

const roundMoney = (value) => Number(value.toFixed(CENTS))

// Accepts a raw number, a numeric string (pg returns numeric as string) or an
// expense-like object. Anything else is a programming/data error.
const readAmount = (expense) => {
  const raw = (expense !== null && typeof expense === 'object')
    ? (expense.monto ?? expense.monto_real ?? expense.expenseAmount)
    : expense

  const amount = typeof raw === 'string' ? Number(raw) : raw

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new TypeError('El monto del gasto debe ser un número válido.')
  }
  if (amount < 0) {
    throw new RangeError('El monto del gasto no puede ser negativo.')
  }

  return amount
}

/**
 * Accumulated spending for a project: the sum of all its expenses.
 * A project without expenses accumulates 0.
 */
export const sumExpenses = (expenses = []) => {
  if (!Array.isArray(expenses)) {
    throw new TypeError('La lista de gastos debe ser un arreglo.')
  }

  return roundMoney(expenses.reduce((total, expense) => total + readAmount(expense), 0))
}

/**
 * Share of the budget already consumed, as a ratio (1 === budget exhausted).
 * A budget of 0 (or missing) yields 0 instead of dividing by zero.
 */
export const calculateUsageRatio = (totalSpent, totalBudget) => {
  if (!totalBudget || totalBudget <= 0) return 0
  return totalSpent / totalBudget
}

/** Same ratio expressed as a percentage, rounded to two decimals. */
export const calculateUsagePercentage = (totalSpent, totalBudget) =>
  roundMoney(calculateUsageRatio(totalSpent, totalBudget) * 100)

/**
 * Alert level for a usage ratio. Without an allocated budget there is nothing
 * to compare against, so no alert is emitted.
 */
export const computeAlert = (usageRatio, totalBudget) => {
  if (!totalBudget || totalBudget <= 0) {
    return { alerta: null, alerta_nivel: null }
  }

  let level = 'SALUDABLE'
  if (usageRatio > ALERT_LEVELS.EXCEDIDO.threshold) level = 'EXCEDIDO'
  else if (usageRatio >= ALERT_LEVELS.CRITICO.threshold) level = 'CRITICO'
  else if (usageRatio >= ALERT_LEVELS.ADVERTENCIA.threshold) level = 'ADVERTENCIA'
  else if (usageRatio >= ALERT_LEVELS.PRECAUCION.threshold) level = 'PRECAUCION'

  if (level === 'SALUDABLE') {
    return { alerta: null, alerta_nivel: 'SALUDABLE' }
  }

  return { alerta: ALERT_LEVELS[level].message, alerta_nivel: level }
}

/**
 * Full budget status for a project from its allocated budget and its expenses.
 * Single entry point for the "accumulated spend vs. budget" rule.
 */
export const buildBudgetStatus = ({ presupuesto_total = 0, gastos = [] } = {}) => {
  const totalBudget = Number(presupuesto_total) || 0
  const totalSpent = sumExpenses(gastos)
  const usageRatio = calculateUsageRatio(totalSpent, totalBudget)
  const { alerta, alerta_nivel } = computeAlert(usageRatio, totalBudget)

  return {
    presupuesto_total: roundMoney(totalBudget),
    total_gastado: totalSpent,
    disponible: roundMoney(totalBudget - totalSpent),
    porcentaje_uso: Number(usageRatio.toFixed(4)),
    porcentaje_completado: Math.min(100, Math.round(usageRatio * 100)),
    sobrecosto: totalBudget > 0 && totalSpent > totalBudget,
    alerta,
    alerta_nivel,
  }
}
