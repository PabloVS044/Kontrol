import pool from '../db/pool.js'
import { buildSystemPrompt } from './agentContext.js'
import { buildEmpresaAccessContext } from './projectAccessService.js'
import {
  validateReadOnlySql,
  enforceLimit,
  executeReadOnly,
} from './agentSql.js'



const DEFAULT_API_URL = 'https://model.clawstitch.com/v1'
const DEFAULT_MODEL = 'Qwen/Qwen3.6-27B-FP8'
const DEFAULT_TEMPERATURE = 0.2
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_MAX_STEPS = 5
const MAX_HISTORY = 10      // most recent user/assistant turns kept
const MAX_USER_CHARS = 3000 // truncate oversized user messages
const QUERY_RESULT_SAMPLE_ROWS = 20

function parseBooleanEnv(value, fallback = false) {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function getConfig() {
  const url = (process.env.AGENT_API_URL || DEFAULT_API_URL).trim().replace(/\/+$/, '')
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

function userPrefersSpanish(text) {
  return !/\b(project|projects|budget|inventory|task|tasks|report|reports|low stock|overdue|late)\b/.test(
    normalizeUserText(text)
  )
}

function dedupeProjectIds(ids) {
  if (!Array.isArray(ids)) return []
  return [...new Set(
    ids
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )].sort((a, b) => a - b)
}

function buildAgentScope(company, user, accessContext) {
  const projectIds = dedupeProjectIds(accessContext?.project_ids)
  const inventoryProjectIds = dedupeProjectIds(accessContext?.inventory_project_ids)

  return {
    id_empresa: company.id_empresa,
    id_usuario: user.id_usuario,
    rol_empresa: company.rol_empresa,
    management_access: accessContext?.capabilities?.can_create_projects === true,
    project_ids: projectIds,
    inventory_project_ids: inventoryProjectIds,
    capabilities: accessContext?.capabilities ?? {},
  }
}

function isCapabilityPrompt(normalized) {
  return /^(ayuda|help|que puedes hacer|que haces|como me puedes ayudar|como puedes ayudarme|what can you do|who are you|quien eres|para que sirves)\??$/.test(normalized)
}

function buildInstantReply(text) {
  const normalized = normalizeUserText(text)
  if (!normalized || normalized.length > 80) return null

  const isSpanish = /\b(hola|buenas|gracias|ayuda|puedes|que puedes hacer|como estas|quien eres|para que sirves)\b/.test(normalized)

  if (/^(hola|hola!|holi|buenas|buenos dias|buenas tardes|buenas noches|hello|hi|hey)\b/.test(normalized)) {
    return isSpanish
      ? [
          'Hola. Soy **Kontrol AI**.',
          '',
          'Puedo ayudarte con:',
          '- Estado de proyectos',
          '- Presupuestos, gastos e ingresos',
          '- Inventario, stock y movimientos',
          '- Tareas, pendientes y atrasos',
          '- Reportes y resúmenes operativos',
          '',
          'Trabajo en **modo solo lectura**, así que consulto datos pero no los modifico.',
          '',
          'Puedes probar con algo como:',
          '- `¿Cómo van mis proyectos?`',
          '- `¿Qué productos tienen bajo stock?`',
          '- `¿Cómo va el presupuesto del proyecto X?`',
        ].join('\n')
      : [
          'Hi. I am **Kontrol AI**.',
          '',
          'I can help with:',
          '- Project status',
          '- Budgets, expenses, and income',
          '- Inventory, stock, and movements',
          '- Tasks, pending work, and delays',
          '- Reports and operational summaries',
          '',
          'I work in **read-only mode**, so I can query data but not modify it.',
        ].join('\n')
  }

  if (/^(gracias|muchas gracias|thanks|thank you)\b/.test(normalized)) {
    return isSpanish
      ? 'De nada. Si quieres, puedo revisar proyectos, presupuesto, inventario, tareas o reportes.'
      : 'You are welcome. If you want, I can review projects, budgets, inventory, tasks, or reports.'
  }

  if (isCapabilityPrompt(normalized)) {
    return isSpanish
      ? [
          'Puedo ayudarte a consultar información de **Kontrol** en modo **solo lectura**.',
          '',
          'Capacidades:',
          '- Revisar proyectos y su estado',
          '- Analizar presupuesto, gastos, ingresos y movimientos',
          '- Detectar productos con stock bajo',
          '- Ver tareas pendientes, vencidas o por prioridad',
          '- Resumir reportes y actividad reciente',
          '',
          'Límites:',
          '- No modifico datos',
          '- No creo proyectos, tareas ni movimientos',
          '- Si falta contexto, te pediré una aclaración corta',
          '',
          'Si quieres, hazme una consulta directa sobre tus datos.',
        ].join('\n')
      : [
          'I can help you query **Kontrol** data in **read-only mode**.',
          '',
          'Capabilities:',
          '- Review projects and their status',
          '- Analyze budgets, expenses, income, and movements',
          '- Detect low-stock products',
          '- Review pending or overdue tasks',
          '- Summarize reports and recent activity',
        ].join('\n')
  }

  return null
}

function buildRequestProfile(history, cfg) {
  const latestUserText = getLatestUserText(history)
  const instantReply = buildInstantReply(latestUserText)
  const normalized = normalizeUserText(latestUserText)
  const looksAnalytical = /\b(project|projects|budget|budgets|inventory|stock|task|tasks|report|reports|company|companies|proyecto|proyectos|presupuesto|presupuestos|inventario|stock|tarea|tareas|reporte|reportes|empresa|empresas|movimiento|movimientos)\b/.test(normalized)
  const needsLiveData = /\b(cuanto|cuantos|cual|cuales|como va|estado|resumen|lista|listar|muestra|mostrar|dame|revisa|consulta|buscar|hay|tengo|tiene|pendiente|pendientes|atrasada|atrasadas|vencida|vencidas|stock|presupuesto|gasto|gastos|ingreso|ingresos|venta|ventas|compra|compras|movimiento|movimientos|producto|productos|tarea|tareas|proyecto|proyectos|reporte|reportes|empresa|empresas|recent|status|list|show|summary|budget|expense|expenses|income|sales|purchases|movement|movements|product|products|task|tasks|project|projects|report|reports|company|companies)\b/.test(normalized)

  let maxTokens = cfg.maxTokens
  let temperature = cfg.temperature

  if (!looksAnalytical && normalized.length <= 60) {
    maxTokens = Math.min(cfg.maxTokens, 220)
  } else if (!looksAnalytical && normalized.length <= 140) {
    maxTokens = Math.min(cfg.maxTokens, 420)
  } else if (!looksAnalytical) {
    maxTokens = Math.min(cfg.maxTokens, 700)
  } else if (normalized.length <= 160) {
    maxTokens = Math.min(cfg.maxTokens, 700)
  } else if (normalized.length <= 320) {
    maxTokens = Math.min(cfg.maxTokens, 950)
  } else {
    maxTokens = Math.min(cfg.maxTokens, 1200)
  }

  if (looksAnalytical || needsLiveData) {
    temperature = Math.min(cfg.temperature, 0.15)
  }

  return {
    instantReply,
    maxTokens,
    temperature,
    disableThinking: cfg.disableThinking,
    querySampleRows: QUERY_RESULT_SAMPLE_ROWS,
    requireQueryFirst: !instantReply && (looksAnalytical || needsLiveData),
  }
}

function detectBuiltinDataIntent(text) {
  const normalized = normalizeUserText(text)

  const asksBudget =
    /\b(presupuesto|budget|gasto|gastos|costos|costes|ingresos|rentabilidad)\b/.test(normalized) &&
    /\b(proyecto|proyectos|empresa|mi proyecto|mis proyectos|my project|my projects|company)\b/.test(normalized)

  if (asksBudget) {
    return 'budget_summary'
  }

  const asksProjectSummary =
    /\bproyectos?\b/.test(normalized) &&
    /\b(como van|como va|estado|resumen|avance|status|summary|overview|how are|how is)\b/.test(normalized)

  if (asksProjectSummary) {
    return 'project_status_summary'
  }

  const asksLowStock =
    /\b(producto|productos|inventario|stock)\b/.test(normalized) &&
    /\b(bajo|bajos|minimo|minimos|faltante|faltantes|agotado|agotados|low stock|understock|under stock)\b/.test(normalized)

  if (asksLowStock) {
    return 'low_stock_summary'
  }

  const asksOverdueTasks =
    /\btareas?\b/.test(normalized) &&
    /\b(atrasad|atrasadas|atrasados|vencid|vencidas|vencidos|overdue|late)\b/.test(normalized)

  if (asksOverdueTasks) {
    return 'overdue_tasks_summary'
  }

  return null
}

async function resolveBudgetProject(userText, scope) {
  if (!scope.project_ids.length) return { type: 'none' }

  const result = await executeReadOnly(
    `
      SELECT id_proyecto, nombre
      FROM public.proyecto
      ORDER BY LOWER(nombre), id_proyecto
      LIMIT 100
    `.trim(),
    [],
    scope
  )

  const projects = result.rows
  if (!projects.length) return { type: 'none' }
  if (projects.length === 1) return { type: 'single', project: projects[0] }

  const normalizedUserText = normalizeUserText(userText)
  const matches = projects.filter((project) =>
    normalizedUserText.includes(normalizeUserText(project.nombre))
  )

  if (matches.length === 1) {
    return { type: 'single', project: matches[0] }
  }

  return { type: 'ambiguous', projects }
}

function formatBudgetSummaryAnswer(rows, userText, mode = 'single') {
  const isSpanish = userPrefersSpanish(userText)

  if (!rows.length) {
    return isSpanish
      ? 'No encontré datos de presupuesto para los proyectos visibles de este usuario.'
      : 'I could not find budget data for this user\'s visible projects.'
  }

  if (mode === 'single') {
    const row = rows[0]
    const budgetTotal = Number(row.presupuesto_total) || 0
    const spent = Number(row.total_gastado) || 0
    const remaining = Number(row.disponible) || 0
    const revenue = Number(row.total_ingresos) || 0
    const usagePct = budgetTotal > 0 ? Math.round((spent / budgetTotal) * 100) : 0

    if (isSpanish) {
      return [
        `El presupuesto de **${row.nombre}** va así:`,
        '',
        `- Presupuesto total: **${budgetTotal.toFixed(2)}**`,
        `- Gastado: **${spent.toFixed(2)}** (${usagePct}%)`,
        `- Disponible: **${remaining.toFixed(2)}**`,
        `- Ingresos: **${revenue.toFixed(2)}**`,
        `- Resultado neto: **${Number(row.resultado_neto || 0).toFixed(2)}**`,
      ].join('\n')
    }

    return [
      `The budget for **${row.nombre}** currently looks like this:`,
      '',
      `- Total budget: **${budgetTotal.toFixed(2)}**`,
      `- Spent: **${spent.toFixed(2)}** (${usagePct}%)`,
      `- Remaining: **${remaining.toFixed(2)}**`,
      `- Revenue: **${revenue.toFixed(2)}**`,
      `- Net result: **${Number(row.resultado_neto || 0).toFixed(2)}**`,
    ].join('\n')
  }

  const totalBudget = rows.reduce((sum, row) => sum + (Number(row.presupuesto_total) || 0), 0)
  const totalSpent = rows.reduce((sum, row) => sum + (Number(row.total_gastado) || 0), 0)
  const totalRemaining = rows.reduce((sum, row) => sum + (Number(row.disponible) || 0), 0)
  const totalRevenue = rows.reduce((sum, row) => sum + (Number(row.total_ingresos) || 0), 0)
  const topRows = rows.slice(0, 5)

  if (isSpanish) {
    return [
      `Resumen de presupuesto en **${rows.length}** proyectos visibles:`,
      '',
      `- Presupuesto total: **${totalBudget.toFixed(2)}**`,
      `- Gastado: **${totalSpent.toFixed(2)}**`,
      `- Disponible: **${totalRemaining.toFixed(2)}**`,
      `- Ingresos: **${totalRevenue.toFixed(2)}**`,
      '',
      'Proyectos:',
      ...topRows.map((row) =>
        `- **${row.nombre}**: gastado ${Number(row.total_gastado || 0).toFixed(2)} de ${Number(row.presupuesto_total || 0).toFixed(2)}`
      ),
    ].join('\n')
  }

  return [
    `Budget summary across **${rows.length}** visible projects:`,
    '',
    `- Total budget: **${totalBudget.toFixed(2)}**`,
    `- Spent: **${totalSpent.toFixed(2)}**`,
    `- Remaining: **${totalRemaining.toFixed(2)}**`,
    `- Revenue: **${totalRevenue.toFixed(2)}**`,
    '',
    'Projects:',
    ...topRows.map((row) =>
      `- **${row.nombre}**: spent ${Number(row.total_gastado || 0).toFixed(2)} of ${Number(row.presupuesto_total || 0).toFixed(2)}`
    ),
  ].join('\n')
}

function formatProjectStatusAnswer(rows, userText) {
  const normalized = normalizeUserText(userText)
  const isSpanish = !/\b(project|projects|status|summary|how are|how is)\b/.test(normalized)

  if (!rows.length) {
    return isSpanish
      ? 'No encontré proyectos registrados para tu empresa.'
      : 'I could not find any projects for your company.'
  }

  const counts = rows.reduce((acc, row) => {
    acc[row.estado] = (acc[row.estado] || 0) + 1
    return acc
  }, {})

  const statusSummary = Object.entries(counts)
    .map(([status, count]) => `**${status}**: ${count}`)
    .join(' · ')

  const visibleRows = rows.slice(0, 10)
  const hiddenCount = Math.max(0, rows.length - visibleRows.length)

  if (isSpanish) {
    const lines = [
      `Tienes **${rows.length}** proyectos registrados.`,
      '',
      `Resumen por estado: ${statusSummary}.`,
      '',
      'Detalle:',
      ...visibleRows.map((row) => {
        const totalTasks = Number(row.total_tareas) || 0
        const completedTasks = Number(row.tareas_completadas) || 0
        const overdueTasks = Number(row.tareas_atrasadas) || 0
        const progress = totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0
        const due = row.fecha_fin_planificada
          ? ` · fin planificado: ${String(row.fecha_fin_planificada).slice(0, 10)}`
          : ''
        return `- **${row.nombre}** — ${row.estado}. Tareas: ${completedTasks}/${totalTasks} completadas (${progress}%) · atrasadas: ${overdueTasks}${due}`
      }),
    ]

    if (hiddenCount > 0) {
      lines.push('', `Y hay **${hiddenCount}** proyectos más que no mostré en este resumen.`)
    }

    return lines.join('\n')
  }

  const lines = [
    `You have **${rows.length}** registered projects.`,
    '',
    `Status summary: ${statusSummary}.`,
    '',
    'Details:',
    ...visibleRows.map((row) => {
      const totalTasks = Number(row.total_tareas) || 0
      const completedTasks = Number(row.tareas_completadas) || 0
      const overdueTasks = Number(row.tareas_atrasadas) || 0
      const progress = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0
      const due = row.fecha_fin_planificada
        ? ` · planned end: ${String(row.fecha_fin_planificada).slice(0, 10)}`
        : ''
      return `- **${row.nombre}** — ${row.estado}. Tasks: ${completedTasks}/${totalTasks} completed (${progress}%) · overdue: ${overdueTasks}${due}`
    }),
  ]

  if (hiddenCount > 0) {
    lines.push('', `There are **${hiddenCount}** more projects not shown in this summary.`)
  }

  return lines.join('\n')
}

async function runBuiltinDataIntent(intent, { userText, company, scope }) {
  if (intent === 'project_status_summary') {
    const isSpanish = userPrefersSpanish(userText)
    if (!scope.management_access && !scope.project_ids.length) {
      return {
        answer: isSpanish
          ? 'No tienes proyectos asignados para consultar en este momento.'
          : 'You do not have any assigned projects to query right now.',
        queries: [],
      }
    }

    const sql = `
      SELECT
        p.id_proyecto,
        p.nombre,
        p.estado,
        p.presupuesto_total,
        p.fecha_inicio,
        p.fecha_fin_planificada,
        COUNT(t.id_tarea)::int AS total_tareas,
        COUNT(t.id_tarea) FILTER (WHERE t.estado = 'COMPLETADA')::int AS tareas_completadas,
        COUNT(t.id_tarea) FILTER (
          WHERE t.estado IN ('PENDIENTE', 'EN_PROGRESO')
            AND t.fecha_vencimiento < CURRENT_DATE
        )::int AS tareas_atrasadas
      FROM public.proyecto p
      LEFT JOIN public.tarea t
        ON t.id_proyecto = p.id_proyecto
      WHERE p.id_empresa = $1
      GROUP BY
        p.id_proyecto,
        p.nombre,
        p.estado,
        p.presupuesto_total,
        p.fecha_inicio,
        p.fecha_fin_planificada
      ORDER BY
        CASE p.estado
          WHEN 'EN_PROGRESO' THEN 1
          WHEN 'PLANIFICADO' THEN 2
          WHEN 'PAUSADO' THEN 3
          WHEN 'COMPLETADO' THEN 4
          WHEN 'CANCELADO' THEN 5
          ELSE 6
        END,
        p.nombre ASC
      LIMIT 20
    `.trim()

    const result = await executeReadOnly(sql, [company.id_empresa], scope)

    return {
      answer: formatProjectStatusAnswer(result.rows, userText),
      queries: [{
        sql,
        rowCount: result.rowCount,
        rationale: 'Get current company project status with task progress and overdue counts.',
      }],
    }
  }

  if (intent === 'low_stock_summary') {
    const isSpanish = userPrefersSpanish(userText)
    if (!scope.capabilities?.can_view_inventory || !scope.inventory_project_ids.length) {
      return {
        answer: isSpanish
          ? 'No tienes acceso al inventario de ningún proyecto asignado.'
          : 'You do not have inventory access for any assigned project.',
        queries: [],
      }
    }

    const sql = `
      SELECT
        pr.nombre,
        pr.stock_actual,
        pr.stock_minimo,
        (pr.stock_minimo - pr.stock_actual) AS deficit,
        p.nombre AS proyecto_nombre
      FROM public.producto pr
      JOIN public.proyecto p
        ON p.id_proyecto = pr.id_proyecto
      WHERE p.id_empresa = $1
        AND pr.id_proyecto = ANY($2::int[])
        AND pr.stock_actual < pr.stock_minimo
      ORDER BY deficit DESC, pr.stock_actual ASC, pr.nombre ASC
      LIMIT 15
    `.trim()

    const result = await executeReadOnly(
      sql,
      [company.id_empresa, scope.inventory_project_ids],
      scope
    )
    if (!result.rows.length) {
      return {
        answer: isSpanish
          ? 'No encontré productos por debajo del stock mínimo en tu empresa.'
          : 'I could not find products below minimum stock in your company.',
        queries: [{
          sql,
          rowCount: result.rowCount,
          rationale: 'List products below their minimum stock threshold.',
        }],
      }
    }

    const rows = result.rows
    const lines = isSpanish
      ? [
          `Encontré **${rows.length}** productos con stock bajo.`,
          '',
          'Más urgentes:',
          ...rows.map((row) =>
            `- **${row.nombre}** (${row.proyecto_nombre}): ${row.stock_actual}/${row.stock_minimo} · faltan ${row.deficit}`
          ),
        ]
      : [
          `I found **${rows.length}** low-stock products.`,
          '',
          'Most urgent:',
          ...rows.map((row) =>
            `- **${row.nombre}** (${row.proyecto_nombre}): ${row.stock_actual}/${row.stock_minimo} · short by ${row.deficit}`
          ),
        ]

    return {
      answer: lines.join('\n'),
      queries: [{
        sql,
        rowCount: result.rowCount,
        rationale: 'List products below their minimum stock threshold.',
      }],
    }
  }

  if (intent === 'overdue_tasks_summary') {
    const isSpanish = userPrefersSpanish(userText)
    if (!scope.management_access && !scope.project_ids.length) {
      return {
        answer: isSpanish
          ? 'No tienes proyectos asignados para consultar tareas en este momento.'
          : 'You do not have any assigned projects to query tasks right now.',
        queries: [],
      }
    }

    const sql = `
      SELECT
        t.nombre,
        t.estado,
        t.prioridad,
        t.fecha_vencimiento,
        p.nombre AS proyecto_nombre
      FROM public.tarea t
      JOIN public.proyecto p
        ON p.id_proyecto = t.id_proyecto
      WHERE p.id_empresa = $1
        AND t.estado IN ('PENDIENTE', 'EN_PROGRESO')
        AND t.fecha_vencimiento < CURRENT_DATE
      ORDER BY
        CASE t.prioridad
          WHEN 'CRITICA' THEN 1
          WHEN 'ALTA' THEN 2
          WHEN 'MEDIA' THEN 3
          WHEN 'BAJA' THEN 4
          ELSE 5
        END,
        t.fecha_vencimiento ASC,
        t.nombre ASC
      LIMIT 15
    `.trim()

    const result = await executeReadOnly(sql, [company.id_empresa], scope)
    if (!result.rows.length) {
      return {
        answer: isSpanish
          ? 'No encontré tareas atrasadas en este momento.'
          : 'I could not find overdue tasks right now.',
        queries: [{
          sql,
          rowCount: result.rowCount,
          rationale: 'List overdue tasks for the current company.',
        }],
      }
    }

    const rows = result.rows
    const lines = isSpanish
      ? [
          `Encontré **${rows.length}** tareas atrasadas.`,
          '',
          'Prioridad de atención:',
          ...rows.map((row) =>
            `- **${row.nombre}** (${row.proyecto_nombre}) · ${row.prioridad} · vencía ${String(row.fecha_vencimiento).slice(0, 10)} · estado: ${row.estado}`
          ),
        ]
      : [
          `I found **${rows.length}** overdue tasks.`,
          '',
          'Priority order:',
          ...rows.map((row) =>
            `- **${row.nombre}** (${row.proyecto_nombre}) · ${row.prioridad} · due ${String(row.fecha_vencimiento).slice(0, 10)} · status: ${row.estado}`
          ),
        ]

    return {
      answer: lines.join('\n'),
      queries: [{
        sql,
        rowCount: result.rowCount,
        rationale: 'List overdue tasks for the current company.',
      }],
    }
  }

  if (intent === 'budget_summary') {
    const isSpanish = userPrefersSpanish(userText)
    const normalized = normalizeUserText(userText)
    const asksCompanyBudget = /\b(empresa|mis proyectos|my projects|company)\b/.test(normalized)

    if (!scope.management_access && !scope.project_ids.length) {
      return {
        answer: isSpanish
          ? 'No tienes proyectos asignados para consultar presupuesto.'
          : 'You do not have any assigned projects to query budget data.',
        queries: [],
      }
    }

    const projectResolution = asksCompanyBudget
      ? { type: 'aggregate' }
      : await resolveBudgetProject(userText, scope)

    if (projectResolution.type === 'none') {
      return {
        answer: isSpanish
          ? 'No encontré proyectos visibles para consultar presupuesto.'
          : 'I could not find any visible projects to query budget data.',
        queries: [],
      }
    }

    if (projectResolution.type === 'ambiguous') {
      return {
        answer: isSpanish
          ? `Puedo revisar el presupuesto, pero necesito que me digas cuál proyecto. Veo varios accesibles: ${projectResolution.projects.slice(0, 5).map((p) => p.nombre).join(', ')}.`
          : `I can review the budget, but I need the project name. I can currently see several accessible projects: ${projectResolution.projects.slice(0, 5).map((p) => p.nombre).join(', ')}.`,
        queries: [],
      }
    }

    const sql = `
      WITH activity_totals AS (
        SELECT
          pa.id_proyecto,
          COALESCE(SUM(pa.monto_planificado), 0)::numeric AS total_planificado,
          COALESCE(SUM(pa.monto_real), 0)::numeric AS total_real_manual
        FROM public.presupuesto_actividad pa
        GROUP BY pa.id_proyecto
      ),
      movement_totals AS (
        SELECT
          mi.id_proyecto,
          COALESCE(SUM(CASE WHEN mi.tipo = 'ENTRADA' THEN mi.precio_unitario * COALESCE(mi.cantidad, 1) ELSE 0 END), 0)::numeric AS gasto_compras,
          COALESCE(SUM(CASE WHEN mi.tipo = 'GASTO_ADMIN' THEN mi.precio_unitario * COALESCE(mi.cantidad, 1) ELSE 0 END), 0)::numeric AS gasto_admin,
          COALESCE(SUM(CASE WHEN mi.tipo = 'SALIDA' THEN mi.precio_unitario * COALESCE(mi.cantidad, 1) ELSE 0 END), 0)::numeric AS total_ingresos
        FROM public.movimiento_inventario mi
        GROUP BY mi.id_proyecto
      ),
      adjustment_totals AS (
        SELECT
          pa.id_proyecto,
          COALESCE(SUM(pa.monto), 0)::numeric AS total_ajustes
        FROM public.presupuesto_ajuste pa
        GROUP BY pa.id_proyecto
      )
      SELECT
        p.id_proyecto,
        p.nombre,
        (COALESCE(p.presupuesto_total, 0) + COALESCE(adj.total_ajustes, 0))::numeric AS presupuesto_total,
        COALESCE(act.total_planificado, 0)::numeric AS total_planificado,
        (
          COALESCE(act.total_real_manual, 0)
          + COALESCE(mov.gasto_compras, 0)
          + COALESCE(mov.gasto_admin, 0)
        )::numeric AS total_gastado,
        COALESCE(mov.total_ingresos, 0)::numeric AS total_ingresos,
        (
          COALESCE(mov.total_ingresos, 0)
          - (
            COALESCE(act.total_real_manual, 0)
            + COALESCE(mov.gasto_compras, 0)
            + COALESCE(mov.gasto_admin, 0)
          )
        )::numeric AS resultado_neto,
        (
          (COALESCE(p.presupuesto_total, 0) + COALESCE(adj.total_ajustes, 0))
          - (
            COALESCE(act.total_real_manual, 0)
            + COALESCE(mov.gasto_compras, 0)
            + COALESCE(mov.gasto_admin, 0)
          )
        )::numeric AS disponible
      FROM public.proyecto p
      LEFT JOIN activity_totals act ON act.id_proyecto = p.id_proyecto
      LEFT JOIN movement_totals mov ON mov.id_proyecto = p.id_proyecto
      LEFT JOIN adjustment_totals adj ON adj.id_proyecto = p.id_proyecto
      WHERE ($1::int IS NULL OR p.id_proyecto = $1)
      ORDER BY LOWER(p.nombre), p.id_proyecto
      LIMIT 20
    `.trim()

    const selectedProjectId = projectResolution.type === 'single'
      ? Number(projectResolution.project.id_proyecto)
      : null

    const result = await executeReadOnly(sql, [selectedProjectId], scope)

    return {
      answer: formatBudgetSummaryAnswer(
        result.rows,
        userText,
        projectResolution.type === 'single' ? 'single' : 'aggregate'
      ),
      queries: [{
        sql,
        rowCount: result.rowCount,
        rationale: projectResolution.type === 'single'
          ? 'Summarize budget health for the selected visible project.'
          : 'Summarize budget health across visible projects.',
      }],
    }
  }

  return null
}

async function callLlm({ messages, signal, cfg, profile }) {
  const endpoint = resolveChatEndpoint(cfg.url)
  if (!endpoint) {
    throw new Error(
      'AI agent endpoint is not configured. Set AGENT_API_URL or use the default ClawStitch Qwen endpoint.'
    )
  }

  if (!cfg.apiKey) {
    throw new Error(
      'AGENT_API_KEY is not configured. Add the Bearer token for the ClawStitch Qwen endpoint in backend/.env.'
    )
  }

  const headers = { 'Content-Type': 'application/json' }
  headers.Authorization = `Bearer ${cfg.apiKey}`

  const body = {
    model: cfg.model,
    messages,
    temperature: profile.temperature,
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
function summarizeQueryResult({ rowCount, rows, fields }, maxRows = QUERY_RESULT_SAMPLE_ROWS) {
  const sample = rows.slice(0, maxRows)
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
 * @param {Object} params.company   { id_empresa, nombre, rol_empresa }
 * @param {AbortSignal} [params.signal]
 *        If aborted (e.g. user clicked "Stop"), the in-flight LLM call is
 *        cancelled and runAgentTurn throws an AbortError.
 * @returns {Promise<{answer:string, queries:Array}>}
 */
export async function runAgentTurn({ history, user, company, signal }) {
  if (!history?.length || history[history.length - 1].role !== 'user') {
    throw new Error('runAgentTurn requires a non-empty history ending with a user message.')
  }

  const latestUserText = getLatestUserText(history)
  const cfg = getConfig()
  const profile = buildRequestProfile(history, cfg)
  const builtinIntent = detectBuiltinDataIntent(latestUserText)
  const accessContext = await buildEmpresaAccessContext({
    client: pool,
    id_empresa: company.id_empresa,
    id_usuario: user.id_usuario,
    rol_empresa: company.rol_empresa,
  })
  const scope = buildAgentScope(company, user, accessContext)

  if (builtinIntent) {
    const builtinResult = await runBuiltinDataIntent(builtinIntent, {
      userText: latestUserText,
      company,
      scope,
    })
    if (builtinResult) return builtinResult
  }

  const systemPrompt = buildSystemPrompt({
    user,
    empresa: {
      id_empresa: company.id_empresa,
      nombre: company.nombre,
      rol_empresa: company.rol_empresa,
    },
    access: scope,
  })

  const messages = [
    { role: 'system', content: systemPrompt },
    ...sanitizeHistory(history),
  ]

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
      if (profile.requireQueryFirst && queries.length === 0) {
        messages.push({ role: 'assistant', content: JSON.stringify(turn) })
        messages.push({
          role: 'user',
          content: JSON.stringify({
            tool: 'protocol',
            error: 'This request appears to need live company data. Run a read-only SQL query first, then answer.',
          }),
        })
        continue
      }

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
        ], scope)
        queries.push({
          sql: safeSql,
          rowCount: result.rowCount,
          rationale: typeof turn.rationale === 'string' ? turn.rationale : undefined,
        })
        messages.push({
          role: 'user',
          content: JSON.stringify({
            tool: 'sql',
            result: summarizeQueryResult(result, profile.querySampleRows),
          }),
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
  const cfg = getConfig()
  return Boolean(cfg.url && cfg.apiKey)
}
