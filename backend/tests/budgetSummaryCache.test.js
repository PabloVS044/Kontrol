import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  BUDGET_CACHE_MAX_ENTRIES,
  BUDGET_CACHE_TTL_MS,
  budgetCacheSize,
  clearBudgetCache,
  getCachedBudgetSummary,
  invalidateCompanyBudgetCache,
  setCachedBudgetSummary,
} from '../src/utils/budgetSummaryCache.js'

beforeEach(() => {
  clearBudgetCache()
  vi.useFakeTimers({ toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
})

/**
 * La clave es empresa + proyectos: el orden de los ids no importa,
 * pero cualquier diferencia de empresa o de conjunto sí.
 */
describe('budgetSummaryCache', () => {
  const data = [{ id_proyecto: 1, presupuesto_total: 100 }]

  it('devuelve lo guardado mientras no venza el TTL', () => {
    setCachedBudgetSummary(1, [1, 2], data)
    vi.advanceTimersByTime(BUDGET_CACHE_TTL_MS - 1)
    expect(getCachedBudgetSummary(1, [1, 2])).toBe(data)
  })

  it('vence a los 30 s y libera la entrada', () => {
    setCachedBudgetSummary(1, [1, 2], data)
    vi.advanceTimersByTime(BUDGET_CACHE_TTL_MS)
    expect(getCachedBudgetSummary(1, [1, 2])).toBeNull()
    expect(budgetCacheSize()).toBe(0)
  })

  it('el orden de los ids no cambia la clave', () => {
    setCachedBudgetSummary(1, [3, 1, 2], data)
    expect(getCachedBudgetSummary(1, [1, 2, 3])).toBe(data)
  })

  it('ordena numéricamente, no como texto', () => {
    setCachedBudgetSummary(1, [10, 9], data)
    expect(getCachedBudgetSummary(1, [9, 10])).toBe(data)
    expect(getCachedBudgetSummary(1, [1, 0, 9])).toBeNull()
  })

  it('no comparte entradas entre empresas', () => {
    setCachedBudgetSummary(1, [1, 2], data)
    expect(getCachedBudgetSummary(2, [1, 2])).toBeNull()
  })

  it('no comparte entradas entre conjuntos distintos de proyectos', () => {
    setCachedBudgetSummary(1, [1, 2], data)
    expect(getCachedBudgetSummary(1, [1])).toBeNull()
    expect(getCachedBudgetSummary(1, [1, 2, 3])).toBeNull()
  })

  it('acepta la empresa como texto o como número', () => {
    setCachedBudgetSummary('1', [1], data)
    expect(getCachedBudgetSummary(1, [1])).toBe(data)
  })

  it('invalidar una empresa borra todas sus entradas y deja las de otras', () => {
    setCachedBudgetSummary(1, [1], data)
    setCachedBudgetSummary(1, [1, 2], data)
    setCachedBudgetSummary(2, [5], data)

    invalidateCompanyBudgetCache(1)

    expect(getCachedBudgetSummary(1, [1])).toBeNull()
    expect(getCachedBudgetSummary(1, [1, 2])).toBeNull()
    expect(getCachedBudgetSummary(2, [5])).toBe(data)
    expect(budgetCacheSize()).toBe(1)
  })

  it('invalidar una empresa sin entradas no falla', () => {
    expect(() => invalidateCompanyBudgetCache(99)).not.toThrow()
  })

  it('reescribir la misma clave no duplica la entrada y renueva el TTL', () => {
    setCachedBudgetSummary(1, [1], data)
    vi.advanceTimersByTime(BUDGET_CACHE_TTL_MS - 1)
    const fresh = [{ id_proyecto: 1, presupuesto_total: 200 }]
    setCachedBudgetSummary(1, [1], fresh)
    vi.advanceTimersByTime(BUDGET_CACHE_TTL_MS - 1)

    expect(getCachedBudgetSummary(1, [1])).toBe(fresh)
    expect(budgetCacheSize()).toBe(1)
  })

  it(`no pasa de ${BUDGET_CACHE_MAX_ENTRIES} entradas: desaloja la más antigua`, () => {
    for (let i = 1; i <= BUDGET_CACHE_MAX_ENTRIES; i++) {
      setCachedBudgetSummary(1 + (i % 3), [i], data)
      vi.advanceTimersByTime(1)
    }
    expect(budgetCacheSize()).toBe(BUDGET_CACHE_MAX_ENTRIES)

    setCachedBudgetSummary(9, [9999], data)

    expect(budgetCacheSize()).toBe(BUDGET_CACHE_MAX_ENTRIES)
    expect(getCachedBudgetSummary(2, [1])).toBeNull()
    expect(getCachedBudgetSummary(1 + (2 % 3), [2])).toBe(data)
    expect(getCachedBudgetSummary(9, [9999])).toBe(data)
  })

  it('desalojar la única entrada de la empresa que se escribe no pierde la nueva', () => {
    setCachedBudgetSummary(1, [1], data)
    vi.advanceTimersByTime(1)
    for (let i = 2; i <= BUDGET_CACHE_MAX_ENTRIES; i++) setCachedBudgetSummary(2, [i], data)

    // La más antigua es la única de la empresa 1, justo donde se escribe ahora.
    setCachedBudgetSummary(1, [7], data)

    expect(getCachedBudgetSummary(1, [7])).toBe(data)
    expect(getCachedBudgetSummary(1, [1])).toBeNull()
    expect(budgetCacheSize()).toBe(BUDGET_CACHE_MAX_ENTRIES)
  })
})
