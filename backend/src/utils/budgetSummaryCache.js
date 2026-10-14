// In-memory, per instance (like rateLimit.js).

export const BUDGET_CACHE_TTL_MS = 30_000
export const BUDGET_CACHE_MAX_ENTRIES = 500

// id_empresa -> Map(sorted project ids -> { data, expiresAt })
const store = new Map()
let size = 0

const idsKey = (projectIds) => [...projectIds].sort((a, b) => a - b).join(',')

export function getCachedBudgetSummary(id_empresa, projectIds) {
  id_empresa = Number(id_empresa)
  const company = store.get(id_empresa)
  const key = idsKey(projectIds)
  const entry = company?.get(key)
  if (!entry) return null

  if (entry.expiresAt <= Date.now()) {
    company.delete(key)
    size--
    if (!company.size) store.delete(id_empresa)
    return null
  }
  return entry.data
}

export function setCachedBudgetSummary(id_empresa, projectIds, data) {
  id_empresa = Number(id_empresa)
  const key = idsKey(projectIds)
  if (store.get(id_empresa)?.delete(key)) size--

  if (size >= BUDGET_CACHE_MAX_ENTRIES) evictOldest()

  let company = store.get(id_empresa)
  if (!company) {
    company = new Map()
    store.set(id_empresa, company)
  }
  company.set(key, { data, expiresAt: Date.now() + BUDGET_CACHE_TTL_MS })
  size++
}

export function invalidateCompanyBudgetCache(id_empresa) {
  id_empresa = Number(id_empresa)
  const company = store.get(id_empresa)
  if (!company) return
  size -= company.size
  store.delete(id_empresa)
}

export function clearBudgetCache() {
  store.clear()
  size = 0
}

export function budgetCacheSize() {
  return size
}

function evictOldest() {
  let oldest = null
  for (const [id_empresa, company] of store) {
    for (const [key, entry] of company) {
      if (!oldest || entry.expiresAt < oldest.entry.expiresAt) {
        oldest = { id_empresa, key, entry }
      }
    }
  }
  if (!oldest) return

  const company = store.get(oldest.id_empresa)
  company.delete(oldest.key)
  size--
  if (!company.size) store.delete(oldest.id_empresa)
}
