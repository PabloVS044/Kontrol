import { icon, svgIcon } from '../fx.js'

// 7 · Proceso · 8 · Lanzamiento · 9 · Cierre

// git log de main agrupado por mes (repositorio actual, primer commit el 6 de abril)
const COMMITS = [
  ['abr', 208],
  ['may', 186],
  ['jun', 5],
  ['jul', 17],
  ['ago', 143],
  ['sep', 182],
  ['oct', 411],
]

const SPRINTS2 = [
  ['S5', '21 jul', 'CI, pruebas unitarias, umbral de cobertura'],
  ['S6', 'ago', 'Escáner POS, exportación, rediseño v2'],
  ['S7', 'sep', 'Usabilidad, carga y seguridad'],
  ['S8', '14 sep', 'Deuda técnica, volumen, 42 RNF'],
  ['S9', '29 sep', 'Refactor, producción, sección Ventas'],
  ['S10', '14 oct', 'Legal, privacidad, suscripciones, respaldos'],
]

export default [
  // ---------------- 7 · Proceso ----------------
  {
    id: 'como-trabajamos',
    section: 7,
    title: 'Cómo trabajamos',
    notes: `«Trabajamos con Scrum y Jira, con tickets SCRUM. Cada funcionalidad va en su rama, entra por pull request a develop y luego a main, y seguimos una guía de contribución con commits convencionales.»`,
    html: `
      <div class="eyebrow" data-in="fade">Proceso</div>
      <h2 class="title md" data-in="words">Scrum, Jira <em>y una rama por funcionalidad.</em></h2>
      <div class="gitflow">
        <svg viewBox="0 0 1660 420">
          <path class="draw lane main" d="M60 90 H1600"/>
          <path class="draw lane dev" d="M60 230 H1600"/>
          <path class="draw lane feat" d="M220 230 C300 230 300 360 380 360 H600 C680 360 680 230 760 230"/>
          <path class="draw lane feat" d="M860 230 C940 230 940 360 1020 360 H1160 C1240 360 1240 230 1320 230"/>
          <path class="draw lane up" d="M800 230 C880 230 880 90 960 90"/>
          <path class="draw lane up" d="M1360 230 C1440 230 1440 90 1520 90"/>
          <g class="commits">
            <circle cx="420" cy="360" r="11"/><circle cx="500" cy="360" r="11"/><circle cx="580" cy="360" r="11"/>
            <circle cx="1060" cy="360" r="11"/><circle cx="1140" cy="360" r="11"/>
            <circle cx="760" cy="230" r="14" class="m"/><circle cx="1320" cy="230" r="14" class="m"/>
            <circle cx="960" cy="90" r="16" class="rel"/><circle cx="1520" cy="90" r="16" class="rel"/>
          </g>
          <text x="60" y="64" class="lbl">main</text><text x="60" y="204" class="lbl">develop</text>
          <text x="400" y="404" class="lbl f">feat/SCRUM-142</text><text x="1040" y="404" class="lbl f">fix/SCRUM-171</text>
          <text x="690" y="300" class="pr">PR</text><text x="1250" y="300" class="pr">PR</text>
        </svg>
      </div>
      <div class="commits-log" data-in="up">
        <span><b>feat</b>(billing): cancel the subscription when a company is closed</span>
        <span><b>fix</b>(pos): recalcular el total en el servidor</span>
      </div>`,
  },
  {
    id: 'linea-tiempo',
    section: 7,
    title: 'Línea de tiempo: 10 sprints',
    notes: `«La historia tiene dos partes. En Ingeniería de Software 1, de marzo a mayo, hicimos los sprints 1 a 4 y construimos la base funcional completa: autenticación, proyectos, inventario, presupuesto, chat, integraciones, la primera versión del asistente y los dos idiomas.»
[clic] «En Ingeniería de Software 2 cambió el foco: de construir a asegurar la calidad. S5 CI y plan maestro de pruebas. S6 escáner del POS, exportación de reportes, inicio del rediseño. S7 usabilidad, carga y seguridad. S8 deuda técnica, volumen y RNF. S9 refactor, producción y sección Ventas. S10 marco legal, privacidad, suscripciones y respaldos.»`,
    html: `
      <div class="eyebrow" data-in="fade">Evolución</div>
      <h2 class="title md" data-in="words">De construir <em>a asegurar la calidad.</em></h2>
      <div class="timeline">
        <div class="tl-is1" data-in="left">
          <div class="tl-h"><b>Ingeniería de Software 1</b><span>17 mar – may</span></div>
          <div class="vel">
            ${[55, 76, 105, 52].map((v, i) => `<div><i style="height:${v * 1.6}px"></i><b>${v}</b><span>S${i + 1}</span></div>`).join('')}
          </div>
          <p>Base funcional completa<small>velocidad en story points</small></p>
        </div>
        <div class="tl-gap" data-in="fade"><span>pausa</span><small>jun – jul</small></div>
        <div class="tl-is2" data-step="1" data-anim="right">
          <div class="tl-h"><b>Ingeniería de Software 2</b><span>21 jul – oct</span></div>
          <div class="sprints">
            ${SPRINTS2.map(([s, d, t]) => `<div data-in="up"><b>${s}</b><span>${d}</span><p>${t}</p></div>`).join('')}
          </div>
        </div>
      </div>`,
  },
  {
    id: 'cifras-equipo',
    section: 7,
    title: 'En números: commits, PRs, personas, meses',
    notes: '«En números: 1152 commits, 165 pull requests, 5 personas y unos 7 meses.»',
    html: `
      <div class="eyebrow" data-in="fade">En números</div>
      <div class="nums">
        <div data-in="up"><div class="big-num"><span data-count="1152" data-sep="">1152</span></div><span>commits</span></div>
        <div data-in="up"><div class="big-num"><span data-count="165">165</span></div><span>pull requests</span></div>
        <div data-in="up"><div class="big-num"><span data-count="5">5</span></div><span>personas</span></div>
        <div data-in="up"><div class="big-num"><span class="u">≈</span><span data-count="7">7</span></div><span>meses</span></div>
      </div>
      <div class="commit-chart" data-in="up" data-delay="0.9">
        <div class="cc-k">Commits por mes en <span class="mono">main</span></div>
        <div class="cc-bars">
          ${COMMITS.map(([m, v]) => `<div class="${v < 30 ? 'low' : ''}"><b>${v}</b><i style="height:${Math.max(4, (v / 411) * 150)}px"></i><span>${m}</span></div>`).join('')}
        </div>
        <div class="cc-note">jun–jul: pausa entre cursos</div>
      </div>`,
  },
  {
    id: 'lecciones',
    section: 7,
    title: 'Tres lecciones de proceso',
    notes: `«Tres lecciones de proceso.»
[1] Las retrospectivas produjeron cambios reales: desde el Sprint 5, el plan de pruebas se versiona antes de escribir los tests.
[2] La deuda técnica la medimos, no la adivinamos: inventario con prioridad y esfuerzo; de 17 elementos cerramos 15, los dos restantes siguen documentados.
[3] Desde el Sprint 8 controlamos el presupuesto de cada sprint, planeado contra ejecutado.`,
    html: `
      <div class="eyebrow" data-in="fade">Lo que aprendimos</div>
      <h2 class="title md" data-in="words">Tres lecciones <em>de proceso.</em></h2>
      <div class="lessons">
        <div class="lesson" data-step="1"><span class="ln">1</span><div><h3>Las retrospectivas cambian cosas</h3><p>Desde el Sprint 5 el plan de pruebas se versiona <b>antes</b> de escribir los tests</p></div></div>
        <div class="lesson" data-step="2"><span class="ln">2</span><div><h3>La deuda técnica se mide</h3><p>Inventario con prioridad y esfuerzo</p></div>
          <div class="debt"><div class="debt-bar">${Array.from({ length: 17 }, (_, i) => `<i class="${i < 15 ? 'done' : ''}"></i>`).join('')}</div><b class="mono">15 / 17 cerradas</b></div></div>
        <div class="lesson" data-step="3"><span class="ln">3</span><div><h3>Presupuesto por sprint</h3><p>Desde el Sprint 8: planeado <b>contra</b> ejecutado</p></div></div>
      </div>`,
    onStep(n, el, animate) {
      el.querySelectorAll('.debt-bar i').forEach((b, i) => {
        b.style.transition = animate ? `background .3s ${0.3 + i * 0.06}s, box-shadow .3s ${0.3 + i * 0.06}s` : 'none'
        b.classList.toggle('lit', n >= 2)
      })
    },
  },
  {
    id: 'antes-despues',
    section: 7,
    title: 'Antes y después — v1 contra v2',
    notes: `Deja la imagen dos segundos en silencio.
«Este es el mismo producto: a la izquierda, la v1; a la derecha, la v2.»
TRANSICIÓN (mirando a Ivana): «¿Está listo para el mercado?»
Imágenes: public/media/capturas/v1.png y v2.png (misma pantalla, mismo tamaño).`,
    html: `
      <div class="compare" data-in="zoom">
        <div class="cmp-img v2"><img src="media/capturas/v2.png" alt="" onerror="this.remove()"><div class="cmp-ph"><b>v2</b><span>media/capturas/v2.png</span></div></div>
        <div class="cmp-img v1"><img src="media/capturas/v1.png" alt="" onerror="this.remove()"><div class="cmp-ph"><b>v1</b><span>media/capturas/v1.png</span></div></div>
        <div class="cmp-handle"><i></i></div>
        <span class="cmp-tag l">v1</span><span class="cmp-tag r">v2</span>
      </div>`,
    enter(el, tl) {
      const v1 = el.querySelector('.cmp-img.v1')
      const h = el.querySelector('.cmp-handle')
      tl.fromTo(v1, { clipPath: 'inset(0 0% 0 0)' }, { clipPath: 'inset(0 50% 0 0)', duration: 2.2, ease: 'power3.inOut' }, 1.2)
      tl.fromTo(h, { left: '100%' }, { left: '50%', duration: 2.2, ease: 'power3.inOut' }, 1.2)
    },
  },

  // ---------------- 8 · Lanzamiento ----------------
  {
    id: 'planes',
    section: 8,
    title: 'Tres planes',
    notes: `«Kontrol se cobra por suscripción por empresa, no por usuario. Eso le conviene a una pyme que crece: sumar a una persona no le sube la factura.»
[clic] Gratis: 3 miembros y 2 proyectos.
[clic] Pro, 19 dólares al mes: 15 miembros, exportación de reportes, equipos, integraciones y marketing.
[clic] Business, 49 dólares: sin límites y con el asistente de IA.`,
    html: `
      <div class="eyebrow" data-in="fade">Modelo de negocio</div>
      <h2 class="title md" data-in="words">Por empresa, <em>no por usuario.</em></h2>
      <div class="plans">
        <div class="plan" data-step="1"><span class="k">Gratis</span><div class="price"><b>$0</b></div><ul><li>3 miembros</li><li>2 proyectos</li><li>Para empezar</li></ul></div>
        <div class="plan pro" data-step="2"><span class="k">Pro</span><div class="price"><b>$19</b><small>/ mes</small></div><ul><li>15 miembros</li><li>Exportación de reportes</li><li>Equipos e integraciones</li><li>Marketing</li></ul></div>
        <div class="plan biz" data-step="3"><span class="k">Business</span><div class="price"><b>$49</b><small>/ mes</small></div><ul><li>Sin límites</li><li>Asistente de IA</li><li>Contenido con IA</li></ul></div>
      </div>`,
  },
  {
    id: 'garantias',
    section: 8,
    title: 'Dos garantías y pagos independientes del proveedor',
    notes: `«Dos garantías: si una empresa baja de plan, no se borra ningún dato; solo se bloquea lo que excede el plan. Y el pago es hospedado: Kontrol nunca toca una tarjeta.»
[clic] «Hoy funciona en modo de prueba, porque Stripe no opera en Guatemala; como el diseño es independiente del proveedor, cambiarlo es sustituir un adaptador.»`,
    html: `
      <div class="eyebrow" data-in="fade">Garantías</div>
      <div class="grid-2" style="margin-top:56px">
        <div class="card" data-in="up">${icon('archive')}<h3>Bajar de plan no borra datos</h3><p>Solo se bloquea lo que excede el plan</p></div>
        <div class="card" data-in="up">${icon('card')}<h3>Pago hospedado</h3><p>Kontrol nunca toca una tarjeta</p></div>
      </div>
      <div class="adapter" data-step="1">
        <div class="ad-box">Kontrol<small>suscripciones</small></div>
        <div class="ad-port"><span>puerto de pagos</span></div>
        <div class="ad-slot">
          <div class="ad-a cur">Stripe <small>modo de prueba</small></div>
          <div class="ad-a next">Proveedor local <small>se sustituye el adaptador</small></div>
        </div>
      </div>`,
    onStep(n, el) {
      el.querySelector('.ad-slot').classList.toggle('swap', n >= 1)
    },
  },
  {
    id: 'marco-legal',
    section: 8,
    title: 'Marco legal guatemalteco',
    notes: `«En lo legal, nos basamos en el marco guatemalteco: el Código Civil para la contratación, la ley de protección al consumidor que vigila la DIACO, el Decreto 47-2008 de contratación electrónica, el Código Penal en delitos informáticos, y el IVA con la factura electrónica, FEL.»
[clic] «Un punto importante: nuestro punto de venta no sustituye la factura electrónica.»`,
    html: `
      <div class="eyebrow" data-in="fade">Marco legal · Guatemala</div>
      <h2 class="title md" data-in="words">Pensado para venderse <em>legalmente.</em></h2>
      <div class="laws">
        <div data-in="up">${icon('scale')}<b>Código Civil</b><small>contratación</small></div>
        <div data-in="up">${icon('users')}<b>Protección al consumidor</b><small>vigilada por la DIACO</small></div>
        <div data-in="up">${icon('doc')}<b>Decreto 47-2008</b><small>contratación electrónica</small></div>
        <div data-in="up">${icon('lock')}<b>Código Penal</b><small>delitos informáticos</small></div>
        <div data-in="up">${icon('coin')}<b>IVA y FEL</b><small>factura electrónica</small></div>
      </div>
      <div class="note-fel" data-step="1" data-anim="pop">${svgIcon('x', 34)} El punto de venta <b>no sustituye</b> la factura electrónica (FEL)</div>`,
  },
  {
    id: 'proteccion-datos',
    section: 8,
    title: 'Protección de datos',
    notes: `«Guatemala todavía no tiene una ley integral de protección de datos; hay iniciativas en el Congreso, como la 5921, la 6103, la 6464 y la 6572.»
[clic] «Elegimos cumplir las obligaciones nacionales y, además, adoptar principios voluntarios: minimización, transparencia y seguridad.»
[clic] «Y definimos cuándo aplicarían reglas como el RGPD europeo, la LGPD de Brasil o la CCPA de California.»`,
    html: `
      <div class="eyebrow" data-in="fade">Protección de datos</div>
      <h2 class="title md" data-in="words">Sin ley integral, <em>igual la cumplimos.</em></h2>
      <div class="privacy">
        <div class="pv-col" data-in="up"><span class="k">Iniciativas en el Congreso</span><div class="pills"><i>5921</i><i>6103</i><i>6464</i><i>6572</i></div></div>
        <div class="pv-col" data-step="1"><span class="k">Principios voluntarios</span><div class="principles"><b>Minimización</b><b>Transparencia</b><b>Seguridad</b></div></div>
        <div class="pv-col" data-step="2"><span class="k">Cuándo aplicarían</span><div class="pills ext"><i>RGPD · UE</i><i>LGPD · Brasil</i><i>CCPA · California</i></div></div>
      </div>`,
  },
  {
    id: 'implementado',
    section: 8,
    title: 'Implementado en la app + pendientes',
    notes: `«Todo esto ya está en la aplicación: términos y condiciones, privacidad, cookies, aviso de IA, aceptación versionada, banner de consentimiento, y exportación y borrado de datos.»
[clic] «Lo pendiente antes de facturar es claro: constituir formalmente la entidad y que un profesional revise los documentos.»
TRANSICIÓN (mirando a Jonathan): «Y con eso, volvamos al lunes del principio.»`,
    html: `
      <div class="impl">
        <div>
          <div class="eyebrow" data-in="fade">Ya en la aplicación</div>
          <div class="checks">
            ${['Términos y condiciones', 'Política de privacidad', 'Política de cookies', 'Aviso de IA', 'Aceptación versionada', 'Banner de consentimiento', 'Exportación y borrado de datos']
              .map((t) => `<div data-in="left"><i>${svgIcon('check', 26)}</i>${t}</div>`)
              .join('')}
          </div>
        </div>
        <div class="pending card" data-step="1" data-anim="right">
          <span class="k">Antes de facturar</span>
          <div><i></i>Constituir formalmente la entidad</div>
          <div><i></i>Revisión profesional de los documentos</div>
        </div>
      </div>`,
  },

  // ---------------- 9 · Cierre ----------------
  {
    id: 'mismo-lunes',
    section: 9,
    title: 'El mismo lunes',
    notes: `Tono pausado; el equipo completo pasa al frente durante esta sección.
«Volvamos al gerente del lunes por la mañana. Llega, abre Kontrol, revisa el dashboard y le pregunta al asistente cómo va la semana. Toma sus decisiones en minutos, sin pedirle un Excel a nadie.»`,
    html: `
      <div class="lunes-grid calm">
        <div>
          <div class="eyebrow" data-in="fade">Lunes · por la mañana</div>
          <div class="clock calm" data-in="blur"><span>08</span><i>:</i><span>05</span><small>a.m.</small></div>
          <p class="lead" data-in="up" style="max-width:660px">Decide en <span class="gold">minutos,</span> sin pedirle un Excel a nadie.</p>
        </div>
        <div class="dash card" data-in="right">
          <div class="dash-kpis">
            <div><span>Proyectos activos</span><b>4</b></div>
            <div><span>Presupuesto</span><b>62 %</b></div>
            <div><span>Alertas</span><b class="warn">1</b></div>
          </div>
          <div class="dash-bars">${[64, 38, 81, 52].map((v, i) => `<div><span>Proyecto ${'ABCD'[i]}</span><i><em style="width:${v}%" class="${v > 80 ? 'hot' : ''}"></em></i></div>`).join('')}</div>
          <div class="bubble q">¿Cómo va la semana?</div>
          <div class="bubble a">3 de 4 proyectos van en tiempo. El proyecto C pasó el 80 % del presupuesto y hay 2 productos por agotarse.</div>
        </div>
      </div>`,
    enter(el, tl) {
      tl.fromTo(el.querySelectorAll('.dash-bars em'), { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 1, stagger: 0.12, ease: 'power3.out' }, 0.8)
      tl.fromTo(el.querySelector('.bubble.q'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 1.6)
      tl.fromTo(el.querySelector('.bubble.a'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 2.4)
    },
  },
  {
    id: 'tres-ideas',
    section: 9,
    title: 'Tres ideas y lo que sigue',
    notes: `«Eso es Kontrol: un producto completo, construido de forma profesional y preparado para salir al mercado.»
[clic] «Y lo que sigue es una IA predictiva, que avise antes de que algo pase.»`,
    html: `
      <div class="ideas">
        <div data-in="up"><span>01</span><b>Un producto <em>completo</em></b></div>
        <div data-in="up"><span>02</span><b>Construido de forma <em>profesional</em></b></div>
        <div data-in="up"><span>03</span><b>Preparado para <em>el mercado</em></b></div>
      </div>
      <div class="next-up" data-step="1" data-anim="blur">${svgIcon('rocket', 44)}<span>Lo que sigue</span><b>IA predictiva: avisar <em>antes</em> de que algo pase</b></div>`,
  },
  {
    id: 'final',
    section: 9,
    title: 'Cierre: Control total + Gracias',
    layout: 'center',
    logo3d: '#final-logo',
    notes: `Pausa. Mirada a la sala.
«Control total de tu operación, en un solo sistema.»
[clic] «Gracias; ahora el espacio es de ustedes.»`,
    html: `
      <div class="cover-logo" id="final-logo"></div>
      <h2 class="title" data-in="words" style="font-size:96px;margin-top:0">Control total de tu operación, <em>en un solo sistema.</em></h2>
      <div class="thanks" data-step="1" data-anim="blur">
        <b>Gracias</b>
        <span>¿Preguntas?</span>
        <div class="team"><i>Pablo</i><i>Ivana</i><i>Jonathan</i><i>Juan</i><i>Saraí</i></div>
      </div>`,
  },
  {
    id: 'preguntas',
    section: 9,
    title: 'Preguntas (video de lanzamiento en bucle)',
    notes: 'Fondo para la ronda de preguntas: el video de lanzamiento corre en bucle y sin sonido, con el QR del sitio en la esquina. Se queda aquí hasta terminar.',
    html: `
      <video class="full-bleed" src="media/motion/antesala.mp4" data-autoplay loop></video>
      <div class="qr-mini" data-in="up" data-delay="0.6">
        <div class="qr"><img src="media/qr-kontrol.svg" alt="QR a kontrol.it.com" /><i><img src="media/kontrol.png" alt="" /></i></div>
        <div><span>¿Preguntas?</span><b class="mono">kontrol.it.com</b></div>
      </div>`,
  },
]
