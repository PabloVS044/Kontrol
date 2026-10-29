import { icon } from '../fx.js'

// 0 · Antesala y portada · 1 · Problema · 2 · Solución

export default [
  {
    id: 'portada',
    section: 0,
    title: 'Portada con QR (también antesala)',
    logo3d: '#portada-logo',
    notes:
      'Pantalla mientras entra el público y portada: el QR lleva a https://www.kontrol.it.com/. Pablo se coloca de frente a la sala; al avanzar empieza la sección 1 sin mencionar Kontrol.',
    html: `
      <div class="portada">
        <div class="ante-brand">
          <div class="cover-logo" id="portada-logo"></div>
          <h1 class="title xl" data-in="words" style="margin-top:0">Kontrol</h1>
          <p class="lead" data-in="blur">Control total de tu operación, <span class="gold">en un solo sistema.</span></p>
        </div>
        <div class="qr-card" data-in="up">
          <div class="qr"><img src="media/qr-kontrol.svg" alt="QR a kontrol.it.com" /><i><img src="media/kontrol.png" alt="" /></i></div>
          <span class="eyebrow">Pruébalo</span>
          <b class="mono">kontrol.it.com</b>
        </div>
      </div>`,
  },

  // ---------------- 1 · Problema ----------------
  {
    id: 'lunes',
    section: 1,
    title: 'Escena del caos — lunes por la mañana',
    notes: `De frente a la sala, sin mirar la pantalla. Tono lento.
«Piensen en el gerente de una pequeña empresa un lunes por la mañana. Tiene cuatro proyectos corriendo al mismo tiempo.»
[clic] ¿Cuánto se ha gastado en cada uno? → tiene que pedir el Excel.
[clic] ¿Cómo está el inventario? → lo lleva otra persona.
[clic] ¿Qué proyecto está en riesgo? → lo decide por intuición.
Pausa de dos segundos.`,
    html: `
      <div class="lunes-grid">
        <div>
          <div class="eyebrow" data-in="fade">Lunes · por la mañana</div>
          <div class="clock" data-in="blur"><span>08</span><i>:</i><span>00</span><small>a.m.</small></div>
          <p class="lead" data-in="up" style="max-width:640px">Cuatro proyectos corriendo <span class="gold">al mismo tiempo.</span></p>
        </div>
        <div class="questions">
          <div class="q" data-step="1" data-anim="right"><b>¿Cuánto se ha gastado?</b><span>Hay que pedir el Excel</span></div>
          <div class="q" data-step="2" data-anim="right"><b>¿Cómo está el inventario?</b><span>Lo lleva otra persona</span></div>
          <div class="q" data-step="3" data-anim="right"><b>¿Qué proyecto está en riesgo?</b><span>Por intuición</span></div>
        </div>
      </div>`,
  },
  {
    id: 'sintomas',
    section: 1,
    title: 'Tres síntomas',
    notes: `«No es que haga mal su trabajo. Es que su información está rota. Vemos tres síntomas.»
[clic] Información dispersa: WhatsApp, hojas de cálculo, lo que cada quien recuerda.
[clic] Sin trazabilidad: nadie sabe quién hizo qué ni cuándo.
[clic] Decisiones tardías: se reacciona en vez de prevenir.`,
    html: `
      <div class="eyebrow" data-in="fade">El problema</div>
      <h2 class="title" data-in="words">Su información <em>está rota.</em></h2>
      <div class="grid-3" style="margin-top:64px">
        <div class="card symptom" data-step="1">
          <div class="mini mini-scatter">
            <span style="left:6%;top:14%;rotate:-6deg">WhatsApp · «¿quién pidió las brocas?»</span>
            <span style="left:30%;top:46%;rotate:4deg">presupuesto_v3_FINAL.xlsx</span>
            <span style="left:10%;top:72%;rotate:-3deg">nota: «pagar a proveedor»</span>
          </div>
          <div class="k">01</div>
          <h3>Información dispersa</h3>
          <p>WhatsApp · Excel · memoria</p>
        </div>
        <div class="card symptom" data-step="2">
          <div class="mini mini-log">
            <div><b>?</b>cambió el presupuesto<em>¿cuándo?</em></div>
            <div><b>?</b>sacó 12 taladros<em>¿cuándo?</em></div>
            <div><b>?</b>cerró la tarea<em>¿cuándo?</em></div>
          </div>
          <div class="k">02</div>
          <h3>Sin trazabilidad</h3>
          <p>¿Quién hizo qué? ¿Cuándo?</p>
        </div>
        <div class="card symptom" data-step="3">
          <div class="mini mini-late">
            <div class="late-line"></div>
            <span class="late-a" style="left:24%"><i></i>Se pasa del presupuesto</span>
            <span class="late-b" style="left:80%"><i></i>Se entera</span>
            <em style="left:52%">3 semanas</em>
          </div>
          <div class="k">03</div>
          <h3>Decisiones tardías</h3>
          <p>Se reacciona, no se previene</p>
        </div>
      </div>`,
  },
  {
    id: 'herramientas',
    section: 1,
    title: 'Cuatro herramientas desconectadas',
    notes: `«¿Y qué responde el mercado? Una herramienta para cada cosa: proyectos, inventario, finanzas, reportes.»
[clic] «Cuatro sistemas que no se hablan y cuatro suscripciones que pagar.»
RECORTABLE: si vamos tarde, se dice en una frase.`,
    html: `
      <div class="eyebrow" data-in="fade">Lo que ofrece el mercado</div>
      <h2 class="title" data-in="words">Una herramienta <em>para cada cosa.</em></h2>
      <div class="tools">
        <svg class="tools-links" viewBox="0 0 1660 360" data-layout-ignore>
          <path class="draw broken" d="M300 180 H520" /><path class="draw broken" d="M720 180 H940" /><path class="draw broken" d="M1140 180 H1360" />
        </svg>
        <div class="tool" data-in="pop">${icon('folder')}<b>Proyectos</b><span class="fee">$ / mes</span></div>
        <div class="x" data-in="pop">×</div>
        <div class="tool" data-in="pop">${icon('box')}<b>Inventario</b><span class="fee">$ / mes</span></div>
        <div class="x" data-in="pop">×</div>
        <div class="tool" data-in="pop">${icon('coin')}<b>Finanzas</b><span class="fee">$ / mes</span></div>
        <div class="x" data-in="pop">×</div>
        <div class="tool" data-in="pop">${icon('chart')}<b>Reportes</b><span class="fee">$ / mes</span></div>
      </div>
      <div class="row tools-sum" data-step="1">
        <div><span class="big-num">4</span><p>sistemas que <b>no se hablan</b></p></div>
        <div><span class="big-num">4</span><p>suscripciones <b>que pagar</b></p></div>
      </div>`,
  },
  {
    id: 'mercado',
    section: 1,
    title: 'Dato de mercado: 96.3 % mipymes',
    notes: `«Este no es un caso aislado. Según el Ministerio de Economía, las mipymes son el 96.3 % de las empresas de Guatemala»
[clic] «y generan cerca del 70 % del empleo.»
[clic] «Para ellas construimos Kontrol.»
TRANSICIÓN (mirando a Ivana): «¿Cómo se ve la alternativa?»`,
    html: `
      <div class="market">
        <div class="waffle" data-in="fade">${Array.from({ length: 100 }, (_, i) => `<i class="${i < 96 ? 'on' : i === 96 ? 'part' : ''}"></i>`).join('')}</div>
        <div>
          <div class="eyebrow" data-in="fade">Guatemala</div>
          <div class="big-num" style="font-size:260px;margin-top:20px"><span data-count="96.3" data-decimals="1" data-delay="0.6">96.3</span><span class="u">%</span></div>
          <p class="lead" data-in="up" style="margin-top:8px">de las empresas son <span class="gold">mipymes</span></p>
          <div class="employ" data-step="1">
            <div class="employ-bar"><i></i></div>
            <p><b class="mono">≈ 70 %</b> del empleo</p>
          </div>
          <p class="for-them" data-step="2" data-anim="blur">Para ellas construimos <em>Kontrol.</em></p>
        </div>
      </div>
      <div class="src">Fuente: MINECO, 2025</div>`,
    onStep(n, el, animate) {
      const bar = el.querySelector('.employ-bar i')
      bar.style.transition = animate ? 'width 1.4s cubic-bezier(.22,1,.36,1) .2s' : 'none'
      bar.style.width = n >= 1 ? '70%' : '0%'
    },
  },

  // ---------------- 2 · Solución ----------------
  {
    id: 'revelacion',
    section: 2,
    title: 'Logo y frase de valor',
    logo3d: '#rev-logo',
    notes: `Sube la energía; tono de alivio.
«Esa alternativa se llama Kontrol: un centro de mando que reúne proyectos, recursos y decisiones en un solo sistema, en tiempo real y con inteligencia artificial.»`,
    html: `
      <div class="rev">
        <div class="rev-logo" id="rev-logo"></div>
        <div>
          <div class="eyebrow" data-in="fade" data-delay="0.5">La alternativa</div>
          <h2 class="title xl" data-in="words" data-delay="0.7">Kontrol</h2>
          <p class="lead" data-in="blur" data-delay="1.3" style="font-size:44px;max-width:900px">Un centro de mando para <span class="gold">proyectos, recursos y decisiones.</span></p>
          <div class="rev-points">
            <div data-in="up" data-delay="1.9"><i>01</i>Un solo sistema</div>
            <div data-in="up" data-delay="2.05"><i>02</i>Tiempo real</div>
            <div data-in="up" data-delay="2.2"><i>03</i>Inteligencia artificial</div>
          </div>
        </div>
      </div>`,
  },
  {
    id: 'para-quien',
    section: 2,
    title: 'Para quién es',
    notes: `«Está pensado para pymes y microempresas que manejan varios proyectos o líneas de trabajo, que tienen inventario o ventas, y que operan con equipos pequeños o medianos.»`,
    html: `
      <div class="eyebrow" data-in="fade">Para quién</div>
      <h2 class="title" data-in="words">Pymes y microempresas <em>que…</em></h2>
      <div class="grid-3" style="margin-top:64px">
        <div class="card" data-in="up">
          <div class="mini mini-projects">
            ${[['Remodelación oficina', 72], ['Bodega zona 12', 45], ['Tienda en línea', 18]].map(([n, v]) => `<div><span>${n}</span><i><em style="width:${v}%"></em></i></div>`).join('')}
          </div>
          <h3>Manejan varios proyectos</h3><p>o líneas de trabajo</p>
        </div>
        <div class="card" data-in="up">
          <div class="mini mini-stock">
            <div><span>Taladro</span><b class="low">2</b></div>
            <div><span>Brocas 8 mm</span><b>40</b></div>
            <div><span>Pintura blanca</span><b>18</b></div>
          </div>
          <h3>Tienen inventario</h3><p>o ventas directas</p>
        </div>
        <div class="card" data-in="up">
          <div class="mini mini-team">
            <div class="avatars">${['AM', 'JL', 'SR', 'DP', 'MC'].map((x) => `<i>${x}</i>`).join('')}</div>
            <p>2 a 20 personas<br /><span>roles por empresa y por proyecto</span></p>
          </div>
          <h3>Equipos pequeños</h3><p>o medianos</p>
        </div>
      </div>`,
  },
  {
    id: 'pilares',
    section: 2,
    title: 'Tres pilares',
    notes: `«Se apoya en tres pilares.»
[clic] Todo conectado: un dato se registra una vez y alimenta todo lo demás.
[clic] Visibilidad en tiempo real.
[clic] Decisiones asistidas por IA.`,
    html: `
      <div class="eyebrow" data-in="fade">Tres pilares</div>
      <h2 class="title md" data-in="words">Tres pilares, <em>una misma base.</em></h2>
      <div class="pillars">
        <div class="pillar" data-step="1" data-anim="up">
          <div class="mini pil-graph"><svg viewBox="0 0 530 230"><line x1="265" y1="105" x2="150" y2="40"/><line x1="265" y1="105" x2="380" y2="40"/><line x1="265" y1="105" x2="420" y2="150"/><line x1="265" y1="105" x2="265" y2="190"/><line x1="265" y1="105" x2="110" y2="150"/><g transform="translate(150 40)"><rect x="-62" y="-19" width="124" height="38" rx="19"/><text y="7">Proyectos</text></g><g transform="translate(380 40)"><rect x="-62" y="-19" width="124" height="38" rx="19"/><text y="7">Inventario</text></g><g transform="translate(420 150)"><rect x="-62" y="-19" width="124" height="38" rx="19"/><text y="7">Ventas</text></g><g transform="translate(265 190)"><rect x="-62" y="-19" width="124" height="38" rx="19"/><text y="7">Reportes</text></g><g transform="translate(110 150)"><rect x="-62" y="-19" width="124" height="38" rx="19"/><text y="7">IA</text></g><g transform="translate(265 105)"><circle r="34"/><text y="8">1 dato</text></g></svg></div>
          <span class="pn">01</span><h3>Todo conectado</h3><p>Un dato se registra <b>una vez</b> y alimenta todo lo demás</p>
        </div>
        <div class="pillar" data-step="2" data-anim="up">
          <div class="mini pil-live">
            <div class="live-k"><span><i></i>En vivo</span><b>Ventas de hoy</b></div>
            <svg viewBox="0 0 400 120" preserveAspectRatio="none"><path class="area" d="M0 110 L0 92 L50 84 L100 88 L150 66 L200 70 L250 48 L300 52 L350 30 L400 18 L400 110Z"/><path class="ln" d="M0 92 L50 84 L100 88 L150 66 L200 70 L250 48 L300 52 L350 30 L400 18"/></svg>
            <div class="live-v"><b>Q 5 225</b><span>+ Q 1 350 hace un momento</span></div>
          </div>
          <span class="pn">02</span><h3>Tiempo real</h3><p>Visibilidad de la operación al instante</p>
        </div>
        <div class="pillar" data-step="3" data-anim="up">
          <div class="mini pil-chat">
            <div class="q">¿Qué productos están por agotarse?</div>
            <div class="a">Taladro (2) y Brocas 8 mm (3).</div>
          </div>
          <span class="pn">03</span><h3>Decisiones con IA</h3><p>Preguntas en lenguaje natural sobre tus propios datos</p>
        </div>
      </div>`,
  },
  {
    id: 'una-base',
    section: 2,
    title: 'Una sola base de datos (video motion)',
    notes: `«La diferencia con usar cuatro herramientas es simple: en Kontrol, proyectos, presupuesto, inventario, punto de venta e IA comparten la misma base de datos.»
Video: una venta se registra una vez y se propaga a inventario, presupuesto, reportes, dashboard e IA.`,
    html: `
      <video class="full-bleed" src="media/motion/un-dato.mp4" data-autoplay data-preview-time="11"></video>`,
  },
  {
    id: 'recorrido',
    section: 2,
    title: 'Recorrido: Panorama → Ejecución → Recursos → Decisiones',
    notes: `«El recorrido tiene cuatro etapas: panorama, ejecución, recursos y decisiones. Pablo se los va a mostrar en ese orden.»
TRANSICIÓN (mirando a Pablo): «Empecemos por el panorama.»`,
    html: `
      <div class="eyebrow" data-in="fade">El recorrido</div>
      <h2 class="title" data-in="words">Cuatro etapas, <em>un mismo sistema.</em></h2>
      <div class="route">
        <svg viewBox="0 0 1660 120" class="route-line"><path class="draw" d="M110 60 H1550" /></svg>
        <div class="stop" data-in="pop" data-delay="0.6"><span>01</span>${icon('eye')}<b>Panorama</b><small>Acceso · Dashboard</small></div>
        <div class="stop" data-in="pop" data-delay="0.9"><span>02</span>${icon('target')}<b>Ejecución</b><small>Proyectos · Equipos · Chat</small></div>
        <div class="stop" data-in="pop" data-delay="1.2"><span>03</span>${icon('box')}<b>Recursos</b><small>Inventario · Ventas · Presupuesto · Reportes · Marketing · Integraciones</small></div>
        <div class="stop" data-in="pop" data-delay="1.5"><span>04</span>${icon('spark')}<b>Decisiones</b><small>Asistente de IA</small></div>
      </div>`,
  },
]
