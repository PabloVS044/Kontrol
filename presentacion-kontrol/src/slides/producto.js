import { icon } from '../fx.js'

// 3a · Panorama y ejecución · 3b · Recursos, decisiones y agente IA
// Los videos de demo se sueltan en public/media/demos/<archivo>.mp4; mientras no
// existan, la slide muestra un marcador con el nombre de archivo esperado.

const STAGES = ['Panorama', 'Ejecución', 'Recursos', 'Decisiones']

function journey(stage) {
  return `<div class="journey" data-in="fade">${STAGES.map((s, i) => `${i ? '<i></i>' : ''}<b class="${s === stage ? 'on' : ''}">${s}</b>`).join('')}</div>`
}

function demo({ id, section, stage, title, lead, points, file, dur, notes, extra = '' }) {
  return {
    id,
    section,
    title: `Demo · ${title} (${dur})`,
    notes: `VIDEO ${dur} — el video manda, la voz acompaña.\n${notes}`,
    html: `
      ${journey(stage)}
      <div class="demo-layout">
        <div class="demo-side">
          <h2 class="title" data-in="words">${title}</h2>
          ${lead ? `<p class="lead" data-in="up">${lead}</p>` : ''}
          <div class="points">${points.map((p) => `<span data-in="left">${p}</span>`).join('')}</div>
          ${extra}
        </div>
        <div class="device" data-in="zoom">
          <video src="media/demos/${file}" data-autoplay data-preview-time="3"></video>
          <div class="placeholder">
            <div class="ph-k">VIDEO DE DEMO · ${dur}</div>
            <div class="ph-t">${title}</div>
            <div class="ph-f">public/media/demos/${file}</div>
          </div>
        </div>
      </div>`,
  }
}

function stageCard(section, n, stage, line, notes, items) {
  return {
    id: `etapa-${stage.toLowerCase()}`,
    section,
    title: `Etapa ${n} · ${stage}`,
    layout: 'center',
    notes,
    html: `
      <div class="eyebrow" data-in="fade">Etapa ${n} de 4</div>
      <h2 class="title xl" data-in="words" style="margin-top:12px">${stage}</h2>
      <p class="lead" data-in="up">${line}</p>
      <div class="stage-items">${items.map((t, i) => `<span data-in="up" data-delay="${0.7 + i * 0.08}">${t}</span>`).join('')}</div>
      <div class="journey big" data-in="fade" data-delay="0.9">${STAGES.map((s, i) => `${i ? '<i></i>' : ''}<b class="${i < n ? 'on' : ''}">${s}</b>`).join('')}</div>`,
  }
}

export default [
  // ---------------- 3a ----------------
  stageCard('3a', 1, 'Panorama', 'Cómo arranca una empresa y qué ve primero.', 'Ritmo ágil. Idea que se repite: todo funciona por empresa.', ['Acceso y onboarding', 'Dashboard']),
  demo({
    id: 'demo-acceso',
    section: '3a',
    stage: 'Panorama',
    title: 'Acceso y onboarding',
    points: ['Correo o Google', 'Empresa + invitación por enlace', 'Una cuenta, varias empresas', 'Términos legales aceptados'],
    file: 'acceso.mp4',
    dur: '0:25',
    notes: '«Todo empieza con el registro, con correo o con Google. Se crea la empresa y se invita al equipo con un enlace. Una misma cuenta puede pertenecer a varias empresas, y al entrar cada persona acepta los términos legales.»',
  }),
  demo({
    id: 'demo-dashboard',
    section: '3a',
    stage: 'Panorama',
    title: 'Dashboard',
    points: ['Proyectos activos', 'Presupuesto consumido', 'Alertas'],
    file: 'dashboard.mp4',
    dur: '0:30',
    extra: `<div class="mini-stat" data-in="up"><span class="mono">1</span> petición al servidor<small>antes: una por proyecto</small></div>`,
    notes: '«Esto es lo primero que ve el gerente del lunes: proyectos activos, presupuesto consumido y alertas, en una sola pantalla. Y es rápido: el resumen se carga en una sola petición al servidor; antes eran varias, una por proyecto.»',
  }),
  stageCard('3a', 2, 'Ejecución', 'Organizar el trabajo, el equipo y la conversación.', 'Pasar rápido: es solo el cambio de etapa.', ['Proyectos', 'Equipos y roles', 'Chat']),
  demo({
    id: 'demo-proyectos',
    section: '3a',
    stage: 'Ejecución',
    title: 'Proyectos',
    points: ['Tareas asignadas', 'Bitácora con evidencias', 'Quién lo hizo y cuándo', 'Miembros, permisos y métricas'],
    file: 'proyectos.mp4',
    dur: '0:50',
    notes: `«Los proyectos son el corazón de la ejecución. Se crea el proyecto, se dividen las tareas y se asignan a una persona.»
Mientras corre la bitácora: «Cada avance se registra en la bitácora, con evidencias adjuntas. Cada cambio queda registrado: quién lo hizo y cuándo. Eso resuelve el síntoma de la trazabilidad.»
Mientras corren miembros y métricas: «Cada proyecto tiene sus propios miembros y permisos, y sus métricas de avance.»`,
  }),
  demo({
    id: 'demo-equipos',
    section: '3a',
    stage: 'Ejecución',
    title: 'Equipos y roles',
    points: ['Equipos con líder', 'Roles de empresa', 'Roles de proyecto', 'Permisos detallados'],
    file: 'equipos.mp4',
    dur: '0:25',
    notes: '«Los equipos tienen un líder. Hay dos niveles de roles: los de la empresa y los de cada proyecto, con permisos detallados. Así cada persona ve y edita solo lo que le corresponde.»',
  }),
  demo({
    id: 'demo-chat',
    section: '3a',
    stage: 'Ejecución',
    title: 'Chat',
    points: ['Tiempo real', 'Archivos adjuntos', 'Junto al proyecto, no en WhatsApp'],
    file: 'chat.mp4',
    dur: '0:20',
    notes: `«Y la comunicación se queda dentro de la plataforma: chat en tiempo real, con archivos adjuntos. Lo que antes estaba en WhatsApp ahora queda junto al proyecto.»
Transición interna: «Ya está organizado el trabajo; ahora vamos a los recursos.»`,
  }),

  // ---------------- 3b ----------------
  stageCard('3b', 3, 'Recursos', 'El dinero y el inventario, bajo control.', 'Objetivo: cómo Kontrol controla el dinero y el inventario.', ['Inventario', 'Punto de venta', 'Presupuesto', 'Reportes', 'Marketing', 'Integraciones', 'Configuración']),
  demo({
    id: 'demo-inventario',
    section: '3b',
    stage: 'Recursos',
    title: 'Inventario y proveedores',
    points: ['Productos y stock', 'Cada entrada y salida registrada', 'Varios proveedores por producto'],
    file: 'inventario.mp4',
    dur: '0:35',
    notes: '«En inventario se registran productos, stock y movimientos. Cada entrada y salida queda registrada, y un mismo producto puede tener varios proveedores vinculados.»',
  }),
  demo({
    id: 'demo-pos',
    section: '3b',
    stage: 'Recursos',
    title: 'Punto de venta y Ventas',
    points: ['Escáner con la cámara', 'IVA y descuento configurables', 'Total calculado en el servidor', 'Stock descontado solo', 'Ventas: menú propio'],
    file: 'pos-ventas.mp4',
    dur: '0:40',
    notes: `«Si la empresa vende directo, tiene un punto de venta integrado. Se escanea el código con la cámara o se escribe a mano, se confirma y se cobra. El IVA y el descuento son configurables, y el total lo calcula el servidor. El stock se descuenta solo.»
Mientras corre el historial: «Ventas tiene ahora su propio menú, con historial y utilidad del período. Ese menú existe porque en las pruebas de usabilidad nadie encontraba las ventas.»`,
  }),
  demo({
    id: 'demo-presupuesto',
    section: '3b',
    stage: 'Recursos',
    title: 'Presupuesto',
    points: ['Cada gasto se descuenta del proyecto'],
    file: 'presupuesto.mp4',
    dur: '0:30',
    extra: `
      <div class="budget" data-in="up">
        <div class="budget-bar"><i></i><b style="left:60%"><span>60 %</span></b><b style="left:80%"><span>80 %</span></b></div>
        <small>Alertas antes de pasarse</small>
      </div>`,
    notes: '«Cada gasto se registra y se descuenta del presupuesto del proyecto. Las alertas avisan antes de pasarse: la primera al 60 % del presupuesto y otra al 80 %. El gerente se entera antes del problema, no después.»',
  }),
  demo({
    id: 'demo-reportes',
    section: '3b',
    stage: 'Recursos',
    title: 'Reportes',
    points: ['Toda la operación consolidada', 'Exportación a PDF', 'Exportación a CSV'],
    file: 'reportes.mp4',
    dur: '0:25',
    notes: '«Los reportes consolidan los datos de toda la operación y se exportan a PDF o CSV.»',
  }),
  demo({
    id: 'demo-marketing',
    section: '3b',
    stage: 'Recursos',
    title: 'Marketing',
    points: ['Campañas', 'Publicaciones programadas', 'Métricas', 'Contenido con IA (Business)'],
    file: 'marketing.mp4',
    dur: '0:25',
    notes: '«Hay un centro de marketing: campañas, publicaciones programadas y sus métricas. En el plan Business, el contenido se puede generar con IA.»\nRECORTABLE a 0:15.',
  }),
  demo({
    id: 'demo-integraciones',
    section: '3b',
    stage: 'Recursos',
    title: 'Integraciones',
    points: [],
    file: 'integraciones.mp4',
    dur: '0:20',
    extra: `
      <div class="logo-grid">
        <span data-in="pop"><img src="media/logos/slack.png" alt="">Slack</span>
        <span data-in="pop"><img src="media/logos/teams.png" alt="">Teams</span>
        <span data-in="pop"><i class="wa">${icon('chat', 'ic')}</i>WhatsApp</span>
        <span data-in="pop"><img src="media/logos/telegram.png" alt="">Telegram</span>
        <span data-in="pop"><img src="media/logos/send.png" alt="">SendGrid</span>
        <span data-in="pop"><img src="media/logos/twilio.png" alt="">SMS</span>
        <span data-in="pop"><img src="media/logos/webhook.png" alt="">Webhook</span>
      </div>`,
    notes: '«Las notificaciones llegan a donde ya está el equipo: Slack, Teams, WhatsApp, Telegram, correo con SendGrid, SMS o un webhook propio.»',
  }),
  demo({
    id: 'demo-configuracion',
    section: '3b',
    stage: 'Recursos',
    title: 'Configuración',
    points: ['Tema claro, oscuro o del sistema', 'Español o inglés', 'Privacidad', 'Plan contratado'],
    file: 'configuracion.mp4',
    dur: '0:15',
    notes: '«Tema claro, oscuro o el del sistema; español o inglés; y control de privacidad y del plan contratado.»',
  }),
  stageCard('3b', 4, 'Decisiones', 'Preguntarle a tus datos, en tu idioma.', 'Baja el ritmo desde aquí. «Y la última etapa: decisiones.»', ['Asistente de IA']),
  {
    id: 'demo-agente',
    section: '3b',
    title: 'Demo · Agente IA (0:30)',
    notes: `VIDEO 0:30. Baja el ritmo. Deja correr dos segundos del video antes de hablar.
«Le preguntamos al asistente: ¿qué productos están por agotarse?»
Pausa mientras aparece la respuesta.
«Responde con los datos reales de esta empresa, en lenguaje natural. Ya no hace falta ser analista para tomar una decisión informada. Solo hay que saber qué preguntar.»
Sin explicación técnica aquí (la da Juan). Si preguntan: «Juan explica cómo lo protegemos».
TRANSICIÓN (mirando a Jonathan): «Todo esto, ¿cómo está construido?»`,
    html: `
      <div class="agent">
        <div class="agent-head">
          ${journey('Decisiones')}
          <div class="ask" data-in="blur"><span class="mono">›</span> ¿Qué productos están por agotarse?</div>
        </div>
        <div class="device wide" data-in="zoom">
          <video src="media/demos/agente-ia.mp4" data-autoplay data-preview-time="3"></video>
          <div class="placeholder">
            <div class="ph-k">VIDEO DE DEMO · 0:30</div>
            <div class="ph-t">Agente de IA</div>
            <div class="ph-f">public/media/demos/agente-ia.mp4</div>
          </div>
        </div>
      </div>`,
  },
]
