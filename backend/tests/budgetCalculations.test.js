import { describe, it, expect } from 'vitest'
import {
  ALERT_LEVELS,
  buildBudgetStatus,
  calculateUsagePercentage,
  calculateUsageRatio,
  computeAlert,
  sumExpenses,
} from '../src/utils/budgetCalculations.js'
import { expenseSchema } from '../src/schemas/budgetSchema.js'

// HU-30 · Cálculo de gasto acumulado contra presupuesto total y alerta de sobrecosto.

describe('Caso 1 · Gasto acumulado igual a la suma de gastos del proyecto', () => {
  it('acumula la lista de montos del proyecto', () => {
    expect(sumExpenses([1500, 2300.5, 700.25])).toBe(4500.75)
  })

  it('acepta gastos como objetos y como numeric de Postgres (string)', () => {
    expect(sumExpenses([{ monto: 1200 }, { monto_real: '800.40' }, '199.60'])).toBe(2200)
    // el payload del endpoint de registro de gastos usa expenseAmount
    expect(sumExpenses([{ expenseAmount: 350 }, { expenseAmount: 150 }])).toBe(500)
  })

  it('redondea a centavos para que el acumulado no arrastre ruido de punto flotante', () => {
    // 0.1 + 0.2 === 0.30000000000000004 en aritmética IEEE-754
    expect(sumExpenses([0.1, 0.2])).toBe(0.3)
  })

  it('el acumulado coincide con el total reportado en el estado del presupuesto', () => {
    const gastos = [1000, 250.75, 99.25]
    const status = buildBudgetStatus({ presupuesto_total: 5000, gastos })

    expect(status.total_gastado).toBe(sumExpenses(gastos))
    expect(status.total_gastado).toBe(1350)
    expect(status.disponible).toBe(3650)
  })
})

describe('Caso 2 · Porcentaje consumido del presupuesto', () => {
  it('calcula la razón de uso sobre el presupuesto total', () => {
    expect(calculateUsageRatio(2500, 10000)).toBe(0.25)
  })

  it('expresa el consumo como porcentaje con dos decimales', () => {
    expect(calculateUsagePercentage(2500, 10000)).toBe(25)
    expect(calculateUsagePercentage(3333, 10000)).toBe(33.33)
  })

  it('publica el porcentaje en el estado del presupuesto', () => {
    const status = buildBudgetStatus({ presupuesto_total: 8000, gastos: [2000, 2000] })

    expect(status.porcentaje_uso).toBe(0.5)
    expect(status.porcentaje_completado).toBe(50)
  })

  it('limita el porcentaje mostrado a 100 aunque el gasto lo supere', () => {
    const status = buildBudgetStatus({ presupuesto_total: 1000, gastos: [3000] })

    expect(status.porcentaje_uso).toBe(3)
    expect(status.porcentaje_completado).toBe(100)
  })
})

describe('Caso 3 · Gasto menor al presupuesto → sin alerta', () => {
  it('no emite alerta cuando el consumo está por debajo del primer umbral', () => {
    const status = buildBudgetStatus({ presupuesto_total: 10000, gastos: [1000, 2000] })

    expect(status.alerta).toBeNull()
    expect(status.alerta_nivel).toBe('SALUDABLE')
    expect(status.sobrecosto).toBe(false)
    expect(status.disponible).toBe(7000)
  })

  it('marca PRECAUCION sin ser sobrecosto al pasar el 60%', () => {
    const status = buildBudgetStatus({ presupuesto_total: 10000, gastos: [6500] })

    expect(status.alerta_nivel).toBe('PRECAUCION')
    expect(status.sobrecosto).toBe(false)
  })
})

describe('Caso 4 · Gasto igual al presupuesto → alerta en el umbral exacto', () => {
  it('emite CRITICO cuando el gasto iguala exactamente el presupuesto', () => {
    const status = buildBudgetStatus({ presupuesto_total: 5000, gastos: [2500, 2500] })

    expect(status.porcentaje_uso).toBe(1)
    expect(status.alerta_nivel).toBe('CRITICO')
    expect(status.alerta).toBe(ALERT_LEVELS.CRITICO.message)
    expect(status.disponible).toBe(0)
  })

  it('en el umbral exacto todavía no se considera sobrecosto', () => {
    const status = buildBudgetStatus({ presupuesto_total: 5000, gastos: [5000] })

    expect(status.sobrecosto).toBe(false)
    expect(status.alerta_nivel).not.toBe('EXCEDIDO')
  })
})

describe('Caso 5 · Gasto mayor al presupuesto → alerta de sobrecosto', () => {
  it('emite EXCEDIDO y disponible negativo cuando se supera el presupuesto', () => {
    const status = buildBudgetStatus({ presupuesto_total: 10000, gastos: [8000, 4000] })

    expect(status.alerta_nivel).toBe('EXCEDIDO')
    expect(status.alerta).toBe(ALERT_LEVELS.EXCEDIDO.message)
    expect(status.sobrecosto).toBe(true)
    expect(status.disponible).toBe(-2000)
  })

  it('escala de CRITICO a EXCEDIDO al cruzar el presupuesto', () => {
    expect(computeAlert(1.0, 10000).alerta_nivel).toBe('CRITICO')
    expect(computeAlert(1.01, 10000).alerta_nivel).toBe('EXCEDIDO')
  })
})

describe('Caso 6 · Presupuesto cero → sin división por cero', () => {
  it('devuelve razón 0 en lugar de Infinity o NaN', () => {
    expect(calculateUsageRatio(5000, 0)).toBe(0)
    expect(calculateUsagePercentage(5000, 0)).toBe(0)
    expect(Number.isFinite(calculateUsageRatio(5000, 0))).toBe(true)
  })

  it('no emite alerta si no hay presupuesto asignado contra el cual comparar', () => {
    const status = buildBudgetStatus({ presupuesto_total: 0, gastos: [1200] })

    expect(status.porcentaje_uso).toBe(0)
    expect(status.alerta).toBeNull()
    expect(status.alerta_nivel).toBeNull()
    expect(status.sobrecosto).toBe(false)
    // el gasto se sigue acumulando aunque no haya presupuesto
    expect(status.total_gastado).toBe(1200)
  })

  it('trata un presupuesto ausente o nulo como cero', () => {
    expect(calculateUsageRatio(100, null)).toBe(0)
    expect(calculateUsageRatio(100, undefined)).toBe(0)
    expect(computeAlert(2, null)).toEqual({ alerta: null, alerta_nivel: null })
    expect(buildBudgetStatus().presupuesto_total).toBe(0)
  })
})

describe('Caso 7 · Gasto negativo → rechazo por validación', () => {
  it('rechaza un monto negativo dentro del acumulado', () => {
    expect(() => sumExpenses([1000, -500])).toThrow(RangeError)
    expect(() => sumExpenses([-1])).toThrow(/no puede ser negativo/i)
  })

  it('rechaza montos no numéricos', () => {
    expect(() => sumExpenses(['abc'])).toThrow(TypeError)
    expect(() => sumExpenses([null])).toThrow(TypeError)
    expect(() => sumExpenses('no-es-arreglo')).toThrow(/arreglo/i)
  })

  it('el esquema del endpoint rechaza un gasto negativo o cero antes de registrarlo', () => {
    const negativo = expenseSchema.safeParse({
      projectId: 1,
      activityName: 'Materiales',
      expenseAmount: -250,
    })
    const cero = expenseSchema.safeParse({
      projectId: 1,
      activityName: 'Materiales',
      expenseAmount: 0,
    })

    expect(negativo.success).toBe(false)
    expect(cero.success).toBe(false)
  })

  it('el esquema acepta un gasto positivo válido', () => {
    const result = expenseSchema.safeParse({
      projectId: 1,
      activityName: 'Materiales',
      expenseAmount: 250.5,
      motivo: 'Compra de cemento',
    })

    expect(result.success).toBe(true)
    expect(result.data.expenseAmount).toBe(250.5)
  })
})

describe('Caso 8 · Proyecto sin gastos → acumulado 0', () => {
  it('acumula 0 con lista vacía o sin argumento', () => {
    expect(sumExpenses([])).toBe(0)
    expect(sumExpenses()).toBe(0)
  })

  it('reporta presupuesto íntegro disponible y sin alerta', () => {
    const status = buildBudgetStatus({ presupuesto_total: 15000, gastos: [] })

    expect(status.total_gastado).toBe(0)
    expect(status.disponible).toBe(15000)
    expect(status.porcentaje_uso).toBe(0)
    expect(status.porcentaje_completado).toBe(0)
    expect(status.alerta).toBeNull()
    expect(status.alerta_nivel).toBe('SALUDABLE')
  })
})

describe('Caso 9 · Umbral de advertencia al 80% del presupuesto', () => {
  it('no advierte justo por debajo del 80%', () => {
    const status = buildBudgetStatus({ presupuesto_total: 10000, gastos: [7999.99] })

    expect(status.alerta_nivel).toBe('PRECAUCION')
  })

  it('advierte exactamente en el 80% del presupuesto', () => {
    const status = buildBudgetStatus({ presupuesto_total: 10000, gastos: [8000] })

    expect(status.porcentaje_uso).toBe(0.8)
    expect(status.alerta_nivel).toBe('ADVERTENCIA')
    expect(status.alerta).toBe(ALERT_LEVELS.ADVERTENCIA.message)
    expect(status.sobrecosto).toBe(false)
  })

  it('mantiene ADVERTENCIA entre el 80% y el 100%', () => {
    expect(computeAlert(0.8, 1000).alerta_nivel).toBe('ADVERTENCIA')
    expect(computeAlert(0.95, 1000).alerta_nivel).toBe('ADVERTENCIA')
    expect(computeAlert(0.9999, 1000).alerta_nivel).toBe('ADVERTENCIA')
  })

  it('el umbral de advertencia declarado es 0.8', () => {
    expect(ALERT_LEVELS.ADVERTENCIA.threshold).toBe(0.8)
  })
})
