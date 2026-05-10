/**
 * Frontend client for the Kontrol AI agent.
 *
 * All endpoints scoped under /api/agent — separate from the human chat
 * endpoints at /api/chat.
 */

function authHeaders() {
  const token = localStorage.getItem('token')
  const empresaRaw = localStorage.getItem('empresaActual')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (empresaRaw) {
    try {
      const empresa = JSON.parse(empresaRaw)
      if (empresa?.id_empresa) headers['X-Company-ID'] = String(empresa.id_empresa)
    } catch {
      // ignore — backend will respond with 400 if header is missing
    }
  }
  return headers
}

async function jsonOrThrow(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`)
  }
  return data
}

/* ── Status ──────────────────────────────────────────────────────────────── */

export async function fetchAgentStatus() {
  try {
    const response = await fetch('/api/agent/status', { headers: authHeaders() })
    if (!response.ok) return { configured: false, persistence: false }
    const { data } = await response.json()
    return data ?? { configured: false, persistence: false }
  } catch {
    return { configured: false, persistence: false }
  }
}

/* ── Chat (with abort support) ───────────────────────────────────────────── */

/**
 * Send a chat turn. `signal` (from an AbortController) lets the caller
 * cancel the request — the backend hooks `req.on('close')` and aborts the
 * upstream LLM call, so nothing is wasted.
 *
 * @param {{ role:'user'|'assistant', content:string }[]} messages
 * @param {{ conversationId?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<{
 *   conversationId: string|null,
 *   userMessage: object|null,
 *   assistantMessage: object|null,
 *   answer: string,
 *   queries: object[]
 * }>}
 */
export async function sendAgentMessage(messages, opts = {}) {
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      messages,
      conversationId: opts.conversationId,
    }),
    signal: opts.signal,
  })
  const data = await jsonOrThrow(response)
  return data.data
}

/* ── Conversations ───────────────────────────────────────────────────────── */

export async function listConversations() {
  const response = await fetch('/api/agent/conversations', { headers: authHeaders() })
  const data = await jsonOrThrow(response)
  return data.data
}

export async function loadConversation(conversationId) {
  const response = await fetch(
    `/api/agent/conversations/${encodeURIComponent(conversationId)}/messages`,
    { headers: authHeaders() }
  )
  const data = await jsonOrThrow(response)
  return data.data // { conversation, messages }
}

export async function deleteConversation(conversationId) {
  const response = await fetch(
    `/api/agent/conversations/${encodeURIComponent(conversationId)}`,
    { method: 'DELETE', headers: authHeaders() }
  )
  await jsonOrThrow(response)
}

/* ── Single message edit / remove ────────────────────────────────────────── */

export async function editAgentMessage(messageId, content) {
  const response = await fetch(
    `/api/agent/messages/${encodeURIComponent(messageId)}`,
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    }
  )
  const data = await jsonOrThrow(response)
  return data.data
}

export async function deleteAgentMessage(messageId) {
  const response = await fetch(
    `/api/agent/messages/${encodeURIComponent(messageId)}`,
    { method: 'DELETE', headers: authHeaders() }
  )
  await jsonOrThrow(response)
}
