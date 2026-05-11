import pool from '../db/pool.js'
import { buildSystemPrompt } from './agentContext.js'
import {
  validateReadOnlySql,
  enforceLimit,
  executeReadOnly,
} from './agentSql.js'



const DEFAULT_MODEL = 'Qwen/Qwen3.6-27B-FP8'
const DEFAULT_TEMPERATURE = 0.2
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_MAX_STEPS = 5
const MAX_HISTORY = 12      // most recent user/assistant turns kept
const MAX_USER_CHARS = 4000 // truncate oversized user messages

function parseBooleanEnv(value, fallback = false) {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function getConfig() {
  const url = (process.env.AGENT_API_URL || '').trim().replace(/\/+$/, '')
  return {
    url,
    apiKey: (process.env.AGENT_API_KEY || '').trim(),
    model: process.env.AGENT_MODEL?.trim() || DEFAULT_MODEL,
    temperature: Number(process.env.AGENT_TEMPERATURE) || DEFAULT_TEMPERATURE,
    maxTokens: Number(process.env.AGENT_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
    maxSteps: Number(process.env.AGENT_MAX_STEPS) || DEFAULT_MAX_STEPS,
    disableThinking: parseBooleanEnv(process.env.AGENT_DISABLE_THINKING, false),
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

function normalizeUserText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function getLatestUserText(history) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.role === 'user' && typeof history[i].content === 'string') {
      return history[i].content.trim()
    }
  }
  return ''
}

function buildInstantReply(text) {
  const normalized = normalizeUserText(text)
  if (!normalized || normalized.length > 80) return null

  const isSpanish = /\b(hola|buenas|gracias|ayuda|puedes|que puedes hacer|como estas)\b/.test(normalized)

  if (/^(hola|hola!|holi|buenas|buenos dias|buenas tardes|buenas noches|hello|hi|hey)\b/.test(normalized)) {
    return isSpanish
      ? 'Hola. Puedo ayudarte con proyectos, presupuestos, inventario, tareas y reportes. Dime que quieres revisar.'
      : 'Hi. I can help with projects, budgets, inventory, tasks, and reports. Tell me what you want to review.'
  }

  if (/^(gracias|muchas gracias|thanks|thank you)\b/.test(normalized)) {
    return isSpanish
      ? 'De nada. Si quieres, puedo revisar proyectos, presupuesto, inventario, tareas o reportes.'
      : 'You are welcome. If you want, I can review projects, budgets, inventory, tasks, or reports.'
  }

  if (/^(ayuda|help|que puedes hacer|que haces|what can you do)\??$/.test(normalized)) {
    return isSpanish
      ? 'Puedo consultar tus datos en modo solo lectura: proyectos, presupuestos, inventario, movimientos, tareas y reportes. Dime que necesitas.'
      : 'I can query your data in read-only mode: projects, budgets, inventory, movements, tasks, and reports. Tell me what you need.'
  }

  return null
}

function buildRequestProfile(history, cfg) {
  const latestUserText = getLatestUserText(history)
  const instantReply = buildInstantReply(latestUserText)
  const normalized = normalizeUserText(latestUserText)
  const looksAnalytical = /\b(project|projects|budget|budgets|inventory|stock|task|tasks|report|reports|company|companies|proyecto|proyectos|presupuesto|presupuestos|inventario|stock|tarea|tareas|reporte|reportes|empresa|empresas|movimiento|movimientos)\b/.test(normalized)

  let maxTokens = cfg.maxTokens
  if (!looksAnalytical && normalized.length <= 60) {
    maxTokens = Math.min(cfg.maxTokens, 220)
  } else if (!looksAnalytical && normalized.length <= 140) {
    maxTokens = Math.min(cfg.maxTokens, 420)
  }

  return {
    instantReply,
    maxTokens,
    disableThinking: cfg.disableThinking,
  }
}

async function callLlm({ messages, signal, cfg, profile }) {
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
    max_tokens: profile.maxTokens,
    stream: false,
    // Some servers honor response_format; vLLM ignores unknown fields.
    response_format: { type: 'json_object' },
  }
  if (profile.disableThinking) {
    body.chat_template_kwargs = { enable_thinking: false }
  }

  async function send(payload) {
    try {
      return await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      })
    } catch (err) {
      throw new Error(`Unable to reach the AI inference server: ${err.message}`)
    }
  }

  let response = await send(body)

  if (!response.ok && body.chat_template_kwargs) {
    const errText = await response.text().catch(() => '')
    const unsupportedThinkingFlag =
      response.status === 400 ||
      response.status === 404 ||
      response.status === 422

    if (unsupportedThinkingFlag) {
      const fallbackBody = { ...body }
      delete fallbackBody.chat_template_kwargs
      response = await send(fallbackBody)
    } else {
      throw new Error(`AI inference server returned ${response.status}: ${errText.slice(0, 500)}`)
    }
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`AI inference server returned ${response.status}: ${errText.slice(0, 500)}`)
  }

  const data = await response.json()
  const choice = data?.choices?.[0]
  const message = choice?.message
  // Reasoning models (Qwen 3.6) emit the thinking trace in `reasoning` /
  // `reasoning_content` and the actual turn in `content`. Fall back to those
  // fields if `content` is empty.
  const content =
    message?.content ||
    message?.reasoning_content ||
    message?.reasoning ||
    ''
  if (typeof content !== 'string' || !content.trim()) {
    if (choice?.finish_reason === 'length') {
      throw new Error(
        'AI inference server hit the token limit before producing an answer. Increase AGENT_MAX_TOKENS.'
      )
    }
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
  const profile = buildRequestProfile(history, cfg)
  const queries = []

  if (profile.instantReply) {
    return {
      answer: profile.instantReply,
      queries,
    }
  }

  for (let step = 0; step < cfg.maxSteps + 1; step += 1) {
    if (signal?.aborted) {
      const err = new Error('Agent turn aborted')
      err.name = 'AbortError'
      throw err
    }
    const raw = await callLlm({ messages, signal, cfg, profile })
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
