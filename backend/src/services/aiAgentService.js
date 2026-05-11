import pool from '../db/pool.js'
import { buildSystemPrompt } from './agentContext.js'
import {
  validateReadOnlySql,
  enforceLimit,
  executeReadOnly,
} from './agentSql.js'

/**
 * AI Agent service.
 *
 * Drives a JSON tool-call loop against an OpenAI-compatible chat-completions
 * endpoint (intended for vLLM / SGLang / TGI serving Qwen 3 in FP8).
 *
 * Required env vars:
 *   AGENT_API_URL   Base URL of the OpenAI-compatible API (e.g.
 *                   "https://my-inference.local/v1"). The "/chat/completions"
 *                   suffix is appended automatically if missing.
 *   AGENT_API_KEY   Bearer token. Optional — if empty, no Authorization
 *                   header is sent (vLLM allows this when started without
 *                   --api-key).
 *   AGENT_MODEL     Model identifier as served. Defaults to
 *                   "Qwen/Qwen3-27B-FP8".
 *
 * Optional:
 *   AGENT_TEMPERATURE  Default 0.2
 *   AGENT_MAX_TOKENS   Default 1024
 *   AGENT_MAX_STEPS    Max query→tool-result iterations per user turn.
 *                      Default 5.
 */

const DEFAULT_MODEL = 'Qwen/Qwen3-27B-FP8'
const DEFAULT_TEMPERATURE = 0.2
const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_MAX_STEPS = 5
const MAX_HISTORY = 12      // most recent user/assistant turns kept
const MAX_USER_CHARS = 4000 // truncate oversized user messages

function getConfig() {
  const url = (process.env.AGENT_API_URL || '').trim().replace(/\/+$/, '')
  return {
    url,
    apiKey: (process.env.AGENT_API_KEY || '').trim(),
    model: process.env.AGENT_MODEL?.trim() || DEFAULT_MODEL,
    temperature: Number(process.env.AGENT_TEMPERATURE) || DEFAULT_TEMPERATURE,
    maxTokens: Number(process.env.AGENT_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
    maxSteps: Number(process.env.AGENT_MAX_STEPS) || DEFAULT_MAX_STEPS,
  }
}

function resolveChatEndpoint(baseUrl) {
  if (!baseUrl) return null
  if (/\/chat\/completions\/?$/.test(baseUrl)) return baseUrl
  return `${baseUrl}/chat/completions`
}

/** Loads basic empresa metadata so the model can name the company. */
async function loadEmpresaMeta(idEmpresa, idUsuario) {
  const { rows } = await pool.query(
    `SELECT e.id_empresa, e.nombre, e.industria,
            re.nombre AS rol_empresa
       FROM public.empresa e
       LEFT JOIN public.empresa_usuario eu
         ON eu.id_empresa = e.id_empresa AND eu.id_usuario = $2
       LEFT JOIN public.rol_empresa re
         ON re.id_rol_empresa = eu.id_rol_empresa
      WHERE e.id_empresa = $1
      LIMIT 1`,
    [idEmpresa, idUsuario ?? null]
  )
  return rows[0] || { id_empresa: idEmpresa }
}

/**
 * Parse a model turn that should be a single JSON object.
 * Falls back to extracting the first {...} block from prose so the agent
 * stays robust to small formatting drifts.
 */
function parseJsonTurn(content) {
  if (!content || typeof content !== 'string') return null
  const trimmed = content.trim()

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i)
  if (fenceMatch) {
    const fenced = tryParse(fenceMatch[1].trim())
    if (fenced) return fenced
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end > start) {
    return tryParse(trimmed.slice(start, end + 1))
  }
  return null
}

function tryParse(text) {
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'object' && parsed ? parsed : null
  } catch {
    return null
  }
}

async function callLlm({ messages, signal }) {
  const cfg = getConfig()
  const endpoint = resolveChatEndpoint(cfg.url)
  if (!endpoint) {
    throw new Error(
      'AGENT_API_URL is not configured. Set it in your .env to the OpenAI-compatible base URL of your Qwen inference server.'
    )
  }

  const headers = { 'Content-Type': 'application/json' }
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`

  const body = {
    model: cfg.model,
    messages,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    stream: false,
    // Some servers honor response_format; vLLM ignores unknown fields.
    response_format: { type: 'json_object' },
  }

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    throw new Error(`Unable to reach the AI inference server: ${err.message}`)
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`AI inference server returned ${response.status}: ${errText.slice(0, 500)}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('AI inference server returned a malformed response.')
  }
  return content
}

/** Trim history to the most recent N pairs and clip oversized user input. */
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return []
  const cleaned = history
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
    .map((m) => ({
      role: m.role,
      content: m.role === 'user' ? m.content.slice(0, MAX_USER_CHARS) : m.content,
    }))
  return cleaned.slice(-MAX_HISTORY)
}

/** Compact a query result to a small JSON payload for the next model turn. */
function summarizeQueryResult({ rowCount, rows, fields }) {
  const sample = rows.slice(0, 50)
  return {
    columns: fields,
    row_count: rowCount,
    rows: sample,
    truncated: rows.length > sample.length,
  }
}

/**
 * Main entry point. Runs the agent loop for a single user turn.
 *
 * @param {Object} params
 * @param {Array<{role:'user'|'assistant', content:string}>} params.history
 *        Prior conversation turns (already includes the latest user message).
 * @param {Object} params.user      { id_usuario, email, nombre_rol }
 * @param {Object} params.company   { id_empresa, rol_empresa }
 * @param {AbortSignal} [params.signal]
 *        If aborted (e.g. user clicked "Stop"), the in-flight LLM call is
 *        cancelled and runAgentTurn throws an AbortError.
 * @returns {Promise<{answer:string, queries:Array}>}
 */
export async function runAgentTurn({ history, user, company, signal }) {
  if (!history?.length || history[history.length - 1].role !== 'user') {
    throw new Error('runAgentTurn requires a non-empty history ending with a user message.')
  }

  const empresaMeta = await loadEmpresaMeta(company.id_empresa, user.id_usuario)
  const systemPrompt = buildSystemPrompt({
    user,
    empresa: {
      id_empresa: empresaMeta.id_empresa,
      nombre: empresaMeta.nombre,
      rol_empresa: company.rol_empresa || empresaMeta.rol_empresa,
    },
  })

  const messages = [
    { role: 'system', content: systemPrompt },
    ...sanitizeHistory(history),
  ]

  const cfg = getConfig()
  const queries = []

  for (let step = 0; step < cfg.maxSteps + 1; step += 1) {
    if (signal?.aborted) {
      const err = new Error('Agent turn aborted')
      err.name = 'AbortError'
      throw err
    }
    const raw = await callLlm({ messages, signal })
    const turn = parseJsonTurn(raw)

    if (!turn || typeof turn.action !== 'string') {
      // Last-resort: surface the raw text so the user is not stuck.
      return {
        answer: raw.trim() || 'No pude procesar la respuesta del modelo. Inténtalo de nuevo.',
        queries,
      }
    }

    if (turn.action === 'answer') {
      return {
        answer: typeof turn.text === 'string' && turn.text.trim()
          ? turn.text.trim()
          : 'Sin respuesta.',
        queries,
      }
    }

    if (turn.action === 'query') {
      messages.push({ role: 'assistant', content: JSON.stringify(turn) })

      if (step >= cfg.maxSteps) {
        messages.push({
          role: 'user',
          content: JSON.stringify({
            tool: 'sql',
            error: 'Step budget exhausted. Emit a final {"action":"answer", ...} with what you already know.',
          }),
        })
        continue
      }

      const validation = validateReadOnlySql(turn.sql)
      if (!validation.ok) {
        queries.push({ sql: turn.sql, error: validation.error })
        messages.push({
          role: 'user',
          content: JSON.stringify({ tool: 'sql', error: validation.error }),
        })
        continue
      }

      const safeSql = enforceLimit(validation.sql)
      try {
        const result = await executeReadOnly(safeSql, [
          company.id_empresa,
          user.id_usuario,
        ])
        queries.push({
          sql: safeSql,
          rowCount: result.rowCount,
          rationale: typeof turn.rationale === 'string' ? turn.rationale : undefined,
        })
        messages.push({
          role: 'user',
          content: JSON.stringify({ tool: 'sql', result: summarizeQueryResult(result) }),
        })
      } catch (err) {
        queries.push({ sql: safeSql, error: err.message })
        messages.push({
          role: 'user',
          content: JSON.stringify({ tool: 'sql', error: err.message }),
        })
      }
      continue
    }

    // Unknown action — tell the model to retry with proper protocol.
    messages.push({ role: 'assistant', content: JSON.stringify(turn) })
    messages.push({
      role: 'user',
      content: JSON.stringify({
        tool: 'protocol',
        error: 'Unknown action. Use {"action":"query",...} or {"action":"answer",...}.',
      }),
    })
  }

  return {
    answer: 'No pude completar la consulta dentro del límite de pasos. Por favor reformula la pregunta.',
    queries,
  }
}

export function isAgentConfigured() {
  return Boolean(getConfig().url)
}
