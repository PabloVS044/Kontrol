import { icon, svgIcon } from '../fx.js'

// 4 · Arquitectura · 5 · Datos · 6a/6b · Calidad

export default [
  // ---------------- 4 · Arquitectura ----------------
  {
    id: 'arquitectura',
    section: 4,
    title: 'Diagrama de componentes (video motion)',
    notes: `«Así está construido lo que acaban de ver.» Señala de izquierda a derecha (el video arma el diagrama en ese orden y se queda quieto al final).
Navegador: Vue 3 + Vite + Pinia → Caddy (HTTPS automático) → API Express → PostgreSQL y MongoDB.
Tiempo real por Socket.IO. Asistente: modelo Qwen en servidor propio, API compatible con OpenAI.
Tecla V: pausa / reanuda el video.`,
    html: `<video class="full-bleed" src="media/motion/arquitectura.mp4" data-autoplay data-preview-time="20"></video>`,
  },
  {
    id: 'decisiones',
    section: 4,
    title: 'Seis decisiones técnicas',
    notes: `«Les cuento seis decisiones y por qué las tomamos.» Cada tecnología va con su razón.
[1] Monorepo con workspaces: un pipeline de CI, código compartido, versiones juntas.
[2] JavaScript en todo el stack: un lenguaje para cinco; el cálculo de una venta vive en una carpeta común (frontend y backend).
[3] Express + Zod: cada endpoint valida; errores por un middleware central.
[4] Docker Compose: mismo entorno en Windows, Linux y producción.
[5] Pagos con puerto y adaptador. No fue teórico: Stripe no opera en Guatemala; cambiar de proveedor no toca BD, endpoints ni frontend.
[6] IA autoalojada y configurable: el endpoint se cambia por configuración.`,
    html: `
      <div class="eyebrow" data-in="fade">Arquitectura</div>
      <h2 class="title md" data-in="words">Seis decisiones <em>y su porqué.</em></h2>
      <div class="decisions">
        <div class="dec" data-step="1">${icon('layers')}<span>01</span><h4>Monorepo con workspaces</h4><p>Un CI, código compartido, versiones juntas</p></div>
        <div class="dec" data-step="2">${icon('code')}<span>02</span><h4>JavaScript en todo el stack</h4><p>Un lenguaje; la lógica de una venta se comparte</p></div>
        <div class="dec" data-step="3">${icon('shield')}<span>03</span><h4>Express + Zod</h4><p>Cada endpoint valida; un middleware de errores</p></div>
        <div class="dec" data-step="4">${icon('docker')}<span>04</span><h4>Docker Compose</h4><p>Mismo entorno en Windows, Linux y producción</p></div>
        <div class="dec hl" data-step="5">${icon('plug')}<span>05</span><h4>Pagos: puerto y adaptador</h4><p>Stripe no opera en Guatemala: cambiar de proveedor no toca BD, API ni frontend</p></div>
        <div class="dec" data-step="6">${icon('cloud')}<span>06</span><h4>IA autoalojada</h4><p>Endpoint por configuración, sin depender de un proveedor</p></div>
      </div>`,
  },
  {
    id: 'despliegue',
    section: 4,
    title: 'Despliegue en producción',
    notes: `«Producción corre en una máquina virtual de Google Cloud con 2 vCPU, Caddy y certificados de Let's Encrypt.»
[clic] «Una decisión documentada: esa VM aloja solo producción. Con 8.6 GB de disco, dos ambientes no cabían; el disco llegó a llenarse y rompió un build.»
[clic] «Por eso las pruebas corren en CI.»`,
    html: `
      <div class="eyebrow" data-in="fade">Despliegue</div>
      <h2 class="title md" data-in="words">Producción, <em>y solo producción.</em></h2>
      <div class="deploy">
        <div class="vm card" data-in="left">
          <div class="vm-top"><span class="k">Google Cloud · VM</span><span class="chip sm">2 vCPU</span></div>
          <div class="vm-stack">
            <div class="layer" data-in="up">${svgIcon('lock', 30)}<b>Caddy</b><small>HTTPS · Let's Encrypt</small></div>
            <div class="layer" data-in="up">${svgIcon('code', 30)}<b>Frontend + API</b><small>Docker Compose</small></div>
            <div class="layer" data-in="up">${svgIcon('db', 30)}<b>PostgreSQL · MongoDB</b><small>volúmenes persistentes</small></div>
          </div>
        </div>
        <div class="disk-wrap">
          <div class="disk-label"><span class="k">Disco</span><b class="mono">8.6 GB</b></div>
          <div class="disk">
            <i class="seg prod" style="width:58%"><span>Producción</span></i>
            <i class="seg extra" style="width:42%"><span>Staging</span></i>
            <em class="overflow">+3.1 GB</em>
          </div>
          <div class="disk-fail" data-step="1" data-anim="pop">${svgIcon('x', 34)} Disco lleno → un build roto</div>
          <div class="disk-ci" data-step="2" data-anim="up">${svgIcon('check', 34)} Las pruebas corren en <b>CI</b></div>
        </div>
      </div>`,
    onStep(n, el) {
      el.querySelector('.disk').classList.toggle('full', n >= 1)
      el.querySelector('.disk').classList.toggle('moved', n >= 2)
    },
  },
  {
    id: 'seguridad-diseno',
    section: 4,
    title: 'Seguridad por diseño',
    notes: `RECORTABLE a una frase.
«La seguridad está desde el diseño: JWT e inicio con Google, autorización por empresa y por proyecto, cabeceras de seguridad, límite de intentos de inicio de sesión, protección contra SSRF en las integraciones y credenciales de integraciones cifradas.»
[clic] «Y el pago es hospedado: Kontrol nunca toca una tarjeta, lo que nos deja en el alcance PCI SAQ A.»
TRANSICIÓN (mirando a Juan): «Y los datos que mueve esta arquitectura…»`,
    html: `
      <div class="secdesign">
        <div class="shield-big" data-in="scale">${svgIcon('shield', 260)}</div>
        <div>
          <div class="eyebrow" data-in="fade">Seguridad por diseño</div>
          <div class="sec-list">
            <span data-in="left">${svgIcon('key', 30)} JWT + inicio con Google</span>
            <span data-in="left">${svgIcon('users', 30)} Autorización por empresa y proyecto</span>
            <span data-in="left">${svgIcon('doc', 30)} Cabeceras de seguridad</span>
            <span data-in="left">${svgIcon('lock', 30)} Límite de intentos de inicio de sesión</span>
            <span data-in="left">${svgIcon('globe', 30)} Protección SSRF en integraciones</span>
            <span data-in="left">${svgIcon('key', 30)} Credenciales de integraciones cifradas</span>
          </div>
          <div class="pci" data-step="1" data-anim="pop">${svgIcon('card', 40)}<div><b>Pago hospedado</b><small>Kontrol nunca toca una tarjeta</small></div><em>PCI SAQ A</em></div>
        </div>
      </div>`,
  },

  // ---------------- 5 · Datos ----------------
  {
    id: 'poliglota',
    section: 5,
    title: 'Persistencia políglota',
    notes: `«Usamos dos bases de datos, cada una para lo que hace mejor.»
PostgreSQL, 36 tablas: lo relacional y transaccional (empresa, proyecto, producto, venta, movimiento, presupuesto, suscripción). «Una venta y su descuento de stock pasan juntos o no pasan.»
[clic] MongoDB, 5 modelos: el chat y las conversaciones con el asistente. Se escriben mucho y su esquema cambia.`,
    html: `
      <div class="eyebrow" data-in="fade">Datos</div>
      <h2 class="title md" data-in="words">Dos bases, <em>cada una para lo que hace mejor.</em></h2>
      <div class="grid-2 dbs">
        <div class="card db" data-in="up">
          <div class="db-head">${icon('db')}<div><h3>PostgreSQL</h3><span class="k">Relacional · transaccional</span></div><div class="big-num"><span data-count="36">36</span><small>tablas</small></div></div>
          <div class="tags"><i>empresa</i><i>proyecto</i><i>producto</i><i>venta</i><i>movimiento</i><i>presupuesto</i><i>suscripción</i></div>
          <p class="atomic">Venta + descuento de stock: <b>juntos o nada</b></p>
        </div>
        <div class="card db" data-step="1">
          <div class="db-head">${icon('chat')}<div><h3>MongoDB</h3><span class="k">Documentos</span></div><div class="big-num"><span data-count="5">5</span><small>modelos</small></div></div>
          <div class="tags"><i>chat</i><i>conversaciones con el asistente</i></div>
          <p class="atomic">Mucha escritura · <b>esquema que cambia</b></p>
        </div>
      </div>`,
  },
  {
    id: 'modelo-er',
    section: 5,
    title: 'Modelo entidad-relación simplificado',
    notes: `«Este es el modelo, reducido a sus entidades clave.» Señala «empresa».
«Todo cuelga de empresa. Un usuario puede pertenecer a varias empresas, con roles y permisos de empresa y de proyecto.»
[clic] «Así los datos de una empresa nunca se mezclan con los de otra.»`,
    html: `
      <div class="eyebrow" data-in="fade">Modelo</div>
      <h2 class="title md" data-in="words">Todo cuelga de <em>empresa.</em></h2>
      <svg class="er" viewBox="0 0 1660 640">
        <g class="er-links">
          <path class="draw" d="M560 320 L330 140" /><path class="draw" d="M560 320 L300 330" /><path class="draw" d="M560 320 L330 520" />
          <path class="draw" d="M560 320 L800 140" /><path class="draw" d="M560 320 L820 330" /><path class="draw" d="M560 320 L800 520" />
          <path class="draw" d="M330 140 L120 70" /><path class="draw" d="M330 140 L110 220" />
          <path class="draw" d="M800 140 L1000 70" /><path class="draw" d="M800 520 L1010 590" />
          <path class="draw" d="M820 330 L1010 330" />
        </g>
        <g class="er-nodes">
          <g class="node main" transform="translate(560 320)"><rect x="-120" y="-44" width="240" height="88" rx="22"/><text y="12">Empresa</text></g>
          <g class="node" transform="translate(330 140)"><rect x="-110" y="-34" width="220" height="68" rx="18"/><text y="10">Proyecto</text></g>
          <g class="node" transform="translate(300 330)"><rect x="-130" y="-34" width="260" height="68" rx="18"/><text y="10">Membresía · rol</text></g>
          <g class="node" transform="translate(330 520)"><rect x="-110" y="-34" width="220" height="68" rx="18"/><text y="10">Usuario</text></g>
          <g class="node" transform="translate(800 140)"><rect x="-110" y="-34" width="220" height="68" rx="18"/><text y="10">Producto</text></g>
          <g class="node" transform="translate(820 330)"><rect x="-110" y="-34" width="220" height="68" rx="18"/><text y="10">Venta</text></g>
          <g class="node" transform="translate(800 520)"><rect x="-120" y="-34" width="240" height="68" rx="18"/><text y="10">Suscripción</text></g>
          <g class="node sm" transform="translate(120 70)"><rect x="-90" y="-28" width="180" height="56" rx="14"/><text y="9">Tarea</text></g>
          <g class="node sm" transform="translate(110 220)"><rect x="-100" y="-28" width="200" height="56" rx="14"/><text y="9">Presupuesto</text></g>
          <g class="node sm" transform="translate(1000 70)"><rect x="-110" y="-28" width="220" height="56" rx="14"/><text y="9">Movimiento</text></g>
          <g class="node sm" transform="translate(1010 330)"><rect x="-90" y="-28" width="180" height="56" rx="14"/><text y="9">Detalle</text></g>
          <g class="node sm" transform="translate(1010 590)"><rect x="-90" y="-28" width="180" height="56" rx="14"/><text y="9">Pago</text></g>
        </g>
        <g class="er-other" data-step="1" data-anim="right">
          <line x1="1200" y1="40" x2="1200" y2="610" class="wall" />
          <g class="node ghost" transform="translate(1440 220)"><rect x="-120" y="-44" width="240" height="88" rx="22"/><text y="12">Otra empresa</text></g>
          <g class="node ghost sm" transform="translate(1440 360)"><rect x="-100" y="-28" width="200" height="56" rx="14"/><text y="9">sus datos</text></g>
          <text class="wall-t" x="1440" y="520">nunca se mezclan</text>
        </g>
      </svg>`,
    enter(el, tl) {
      tl.fromTo(el.querySelectorAll('.er-nodes .node'), { opacity: 0, scale: 0.6, transformOrigin: 'center' }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.07, ease: 'back.out(1.8)' }, 0.5)
    },
  },
  {
    id: 'integridad',
    section: 5,
    title: 'Integridad del dinero (DT-02)',
    notes: `«Una deuda técnica que encontramos y cerramos: el precio de una venta lo mandaba el navegador, así que alguien podía manipularlo.»
[clic] «Hoy el servidor recalcula precio, IVA y descuento en cada venta. Lo registramos como DT-02 y quedó resuelta en el Sprint 9.»`,
    html: `
      <div class="eyebrow" data-in="fade">Integridad del dinero</div>
      <h2 class="title md" data-in="words">El precio <em>lo decide el servidor.</em></h2>
      <div class="money">
        <div class="card m-before" data-in="left">
          <span class="k bad">Antes</span>
          <div class="flow">${svgIcon('globe', 40)}<span>Navegador</span><i class="arrow bad"></i>${svgIcon('db', 40)}<span>Servidor</span></div>
          <pre class="json"><span>{</span>
  "producto": "Taladro",
  "precio": <b class="bad strike-me">0.01</b>
<span>}</span></pre>
          <p>Cualquiera podía manipularlo</p>
        </div>
        <div class="card m-after" data-step="1" data-anim="right">
          <span class="k ok">Hoy</span>
          <div class="calc">
            <div><span>Precio</span><b class="mono">Q 450.00</b></div>
            <div><span>Descuento</span><b class="mono">− Q 22.50</b></div>
            <div><span>IVA</span><b class="mono">incluido</b></div>
            <div class="tot"><span>Total</span><b class="mono">Q 427.50</b></div>
          </div>
          <p>Recalculado <b>en cada venta</b></p>
          <div class="badge">DT-02 · resuelta en Sprint 9</div>
        </div>
      </div>`,
  },
  {
    id: 'capas',
    section: 5,
    title: 'Defensa en capas del asistente',
    notes: `«Ahora, el asistente que vieron. Él genera consultas SQL a partir de una pregunta. ¿Qué pasa si genera algo malicioso? Lo protegimos en capas.»
[1] Solo lectura.
[2] No ve las tablas reales: vistas temporales ya filtradas por la empresa de quien pregunta.
[3] Corre con un rol de Postgres sin privilegios.
[4] Cada consulta tiene un límite de tiempo.`,
    html: `
      <div class="layers-wrap">
        <div>
          <div class="eyebrow" data-in="fade">El asistente</div>
          <h2 class="title md" data-in="words">Pregunta → SQL. <em>¿Y si es malicioso?</em></h2>
          <div class="sql" data-in="up"><span class="mono kw">SELECT</span> * <span class="mono kw">FROM</span> venta<br><span class="mono kw">WHERE</span> empresa_id <b class="bad">&lt;&gt; 7</b>;<br><b class="bad">DROP TABLE</b> producto;</div>
        </div>
        <div class="rings">
          <div class="ring r4" data-step="4" data-anim="scale"><span>04 · Límite de tiempo por consulta</span></div>
          <div class="ring r3" data-step="3" data-anim="scale"><span>03 · Rol de Postgres sin privilegios</span></div>
          <div class="ring r2" data-step="2" data-anim="scale"><span>02 · Vistas filtradas por empresa</span></div>
          <div class="ring r1" data-step="1" data-anim="scale"><span>01 · Solo lectura</span></div>
          <div class="core" data-in="pop">${svgIcon('db', 64)}<b>Datos</b></div>
        </div>
      </div>`,
  },
  {
    id: 'capas-video',
    section: 5,
    title: 'Resultado: SQL malicioso bloqueado (video motion)',
    notes: `Pausa.
«El resultado: aunque el modelo escriba un SQL malicioso, la base de datos no le deja ver datos de otra empresa.»
(El video muestra la consulta atravesando las cuatro capas y quedándose solo con los datos propios.)`,
    html: `<video class="full-bleed" src="media/motion/agente-capas.mp4" data-autoplay data-preview-time="16"></video>`,
  },
  {
    id: 'ciclo-dato',
    section: 5,
    title: 'Ciclo de vida del dato',
    notes: `RECORTABLE a 0:10.
«También cuidamos el ciclo de vida del dato: el usuario puede exportar sus datos o borrar su cuenta, y el borrado se coordina entre Postgres y Mongo. Una empresa se puede cerrar, y los eventos de pago son idempotentes: si llegan dos veces, se procesan una. Y tenemos una política de respaldos escrita, con un simulacro de restauración automatizado de las dos bases.»
Transición interna: «Este modelo, ¿aguanta?»`,
    html: `
      <div class="eyebrow" data-in="fade">Ciclo de vida del dato</div>
      <h2 class="title md" data-in="words">Desde que entra <em>hasta que se va.</em></h2>
      <div class="lifecycle">
        <svg viewBox="0 0 1660 40" class="lc-line"><path class="draw" d="M80 20 H1580"/></svg>
        <div data-in="up">${icon('download')}<b>Exportar datos</b><small>el usuario descarga lo suyo</small></div>
        <div data-in="up">${icon('trash')}<b>Borrar cuenta</b><small>coordinado Postgres + Mongo</small></div>
        <div data-in="up">${icon('archive')}<b>Cerrar empresa</b><small>y cancelar la suscripción</small></div>
        <div data-in="up">${icon('repeat')}<b>Pagos idempotentes</b><small>llega dos veces, se procesa una</small></div>
        <div data-in="up">${icon('shield')}<b>Respaldos</b><small>simulacro de restauración automatizado</small></div>
      </div>`,
  },

  // ---------------- 6a · Volumen y usabilidad ----------------
  {
    id: 'volumen',
    section: '6a',
    title: 'Pruebas de volumen',
    notes: `«Lo probamos con volumen creciente, en cuatro niveles, con pgbench y k6. No hubo errores en ningún nivel.»
[clic] «El primer punto de degradación fue la búsqueda del punto de venta con 10 000 productos: 1.04 segundos en el percentil 95, contra un umbral de 800 milisegundos. Quedó identificado y documentado.»`,
    html: `
      <div class="vol">
        <div>
          <div class="eyebrow" data-in="fade">Volumen · pgbench + k6</div>
          <h2 class="title md" data-in="words">Cuatro niveles. <em>Cero errores.</em></h2>
          <div class="levels">
            <div data-in="left"><b>N0</b><span>seed</span><em>13 MB</em></div>
            <div data-in="left"><b>N1</b><span>10 000 productos</span><em>29 MB</em></div>
            <div data-in="left"><b>N2</b><span>50 000 productos</span><em>89 MB</em></div>
            <div data-in="left"><b>N3</b><span>100 000 productos</span><em>167 MB</em></div>
          </div>
        </div>
        <div class="chart card" data-in="up">
          <div class="k">Búsqueda del POS · p95 (ms)</div>
          <svg viewBox="0 0 760 520" class="bars">
            <line x1="60" y1="460" x2="740" y2="460" class="axis"/>
            <line x1="60" y1="${460 - 800 * 0.11}" x2="740" y2="${460 - 800 * 0.11}" class="thr"/>
            <text x="740" y="${450 - 800 * 0.11}" text-anchor="end" class="thr-t">umbral 800 ms</text>
            <g class="bar"><rect x="130" width="120" y="${460 - 265 * 0.11}" height="${265 * 0.11}"/><text x="190" y="${445 - 265 * 0.11}">265</text><text class="xl" x="190" y="500">N1</text></g>
            <g class="bar hot"><rect x="330" width="120" y="${460 - 1040 * 0.11}" height="${1040 * 0.11}"/><text x="390" y="${445 - 1040 * 0.11}">1 040</text><text class="xl" x="390" y="500">N2</text></g>
            <g class="bar dim"><rect x="530" width="120" y="${460 - 3690 * 0.11 + 30}" height="${3690 * 0.11 - 30}"/><text x="590" y="${445 - 3690 * 0.11 + 30}">3 690</text><text class="xl" x="590" y="500">N3</text></g>
          </svg>
          <div class="callout" data-step="1" data-anim="pop"><b>1.04 s</b> con 10 000 productos<small>primer punto de degradación · documentado</small></div>
        </div>
      </div>`,
    enter(el, tl) {
      tl.fromTo(el.querySelectorAll('.bars rect'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1.1, stagger: 0.18, ease: 'power3.out' }, 0.7)
    },
    onStep(n, el) {
      el.querySelector('.bars').classList.toggle('focus', n >= 1)
    },
  },
  {
    id: 'usabilidad',
    section: '6a',
    title: 'Pruebas de usabilidad',
    notes: `«Y lo probamos con personas reales, en dos fases. En la segunda se completaron 14 de 15 tareas sin ayuda, un 93 %.»
[clic] «Lo más valioso fue lo que cambió: nadie encontraba Ventas, y le dimos su propia sección. También corregimos el contraste y la hora que se guardaba mal en las publicaciones.»
TRANSICIÓN (mirando a Jonathan): «Eso con usuarios; Jonathan les cuenta lo automatizado.»`,
    html: `
      <div class="usab">
        <div class="ring-chart" data-in="scale">
          <svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="170" class="track"/><circle cx="200" cy="200" r="170" class="val"/></svg>
          <div class="rc-num"><span class="big-num"><span data-count="93" data-delay="0.6">93</span><span class="u">%</span></span><small>14 de 15 tareas sin ayuda</small></div>
        </div>
        <div>
          <div class="eyebrow" data-in="fade">Usabilidad · 2 fases</div>
          <h2 class="title md" data-in="words">Lo que cambió <em>por las personas.</em></h2>
          <div class="changes" data-step="1">
            <div data-in="left">${svgIcon('coin', 34)}<b>Ventas</b> tiene su propia sección<small>nadie la encontraba</small></div>
            <div data-in="left">${svgIcon('eye', 34)}<b>Contraste</b> corregido</div>
            <div data-in="left">${svgIcon('clock', 34)}<b>Hora</b> de publicaciones corregida</div>
          </div>
        </div>
      </div>`,
    enter(el, tl) {
      const c = el.querySelector('.val')
      const len = 2 * Math.PI * 170
      tl.fromTo(c, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: len * (1 - 14 / 15), duration: 1.8, ease: 'power3.out' }, 0.5)
    },
  },

  // ---------------- 6b · CI, seguridad, carga, RNF ----------------
  {
    id: 'pipeline',
    section: '6b',
    title: 'Pipeline de CI (video motion)',
    notes: `«Todo esto corre solo en GitHub Actions, en cinco workflows: CI con lint, auditoría de dependencias y tests de backend y frontend; integración y regresión; privacidad; carga; y el simulacro de respaldos. Son unos 139 archivos de pruebas, y la cobertura tiene un umbral que solo puede subir.»
(Si preguntan por la cobertura: 38 % backend / 17 % frontend, umbral de 70 % en módulos críticos.)`,
    html: `<video class="full-bleed" src="media/motion/pipeline-ci.mp4" data-autoplay data-preview-time="13"></video>`,
  },
  {
    id: 'cuatro-cifras',
    section: '6b',
    title: 'Cuatro cifras: carga, seguridad, dependencias, RNF',
    notes: `Cifras rápidas, una por frase.
[1] Carga y estrés con k6: 56 327 peticiones, 0 % de errores. Hallazgo: el inicio de sesión con mucha concurrencia depende de la CPU.
[2] OWASP ZAP: ninguna alerta alta ni media.
[3] Vulnerabilidades de dependencias: de 17 a 3, ninguna crítica.
[4] 42 requisitos no funcionales contra pruebas reales: 12 cumplen, 6 no cumplen, 24 sin validar; cada uno con veredicto documentado.
TRANSICIÓN (mirando a Saraí): «¿Y cómo llegamos hasta aquí?»`,
    html: `
      <div class="eyebrow" data-in="fade">Calidad medida</div>
      <div class="figs">
        <div class="fig card" data-step="1">
          <span class="k">Carga y estrés · k6</span>
          <div class="big-num"><span data-count="56327">56 327</span></div>
          <p>peticiones · <b class="ok">0 % errores</b></p>
          <small>Login bajo alta concurrencia: limitado por CPU</small>
        </div>
        <div class="fig card" data-step="2">
          <span class="k">Seguridad · OWASP ZAP</span>
          <div class="big-num"><span data-count="0">0</span></div>
          <p>alertas <b>altas</b> o <b>medias</b></p>
        </div>
        <div class="fig card" data-step="3">
          <span class="k">Dependencias</span>
          <div class="big-num">17 <span class="u">→</span> <span data-count="3" data-from="17">3</span></div>
          <p>vulnerabilidades · <b class="ok">0 críticas</b></p>
        </div>
        <div class="fig card" data-step="4">
          <span class="k">Requisitos no funcionales</span>
          <div class="big-num"><span data-count="42">42</span></div>
          <div class="rnf"><i class="c" style="flex:12">12</i><i class="n" style="flex:6">6</i><i class="s" style="flex:24">24</i></div>
          <div class="rnf-l"><span><i class="c"></i>cumplen</span><span><i class="n"></i>no cumplen</span><span><i class="s"></i>sin validar</span></div>
        </div>
      </div>`,
  },
]
