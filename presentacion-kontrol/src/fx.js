import gsap from 'gsap'

// Estados de partida de cada tipo de entrada (data-in / data-anim).
export const FROM = {
  up: { y: 48, opacity: 0 },
  down: { y: -40, opacity: 0 },
  fade: { opacity: 0 },
  scale: { scale: 0.86, opacity: 0 },
  pop: { scale: 0.4, opacity: 0, ease: 'back.out(2)' },
  blur: { opacity: 0, filter: 'blur(18px)', y: 12 },
  left: { x: -70, opacity: 0 },
  right: { x: 70, opacity: 0 },
  zoom: { scale: 1.25, opacity: 0, filter: 'blur(10px)' },
}

const TO = { y: 0, x: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }

export function animIn(el, kind = 'up', vars = {}) {
  const from = { ...(FROM[kind] || FROM.up) }
  const ease = from.ease || 'power3.out'
  delete from.ease
  const to = {}
  for (const k of Object.keys(from)) to[k] = TO[k]
  return gsap.fromTo(el, from, { ...to, duration: 0.9, ease, clearProps: 'transform,filter', ...vars })
}

// Envuelve cada palabra de un título para revelarlas desde abajo.
export function splitWords(el) {
  if (el.dataset.split) return el.querySelectorAll('.wi')
  el.dataset.split = '1'
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/)
        const frag = document.createDocumentFragment()
        for (const p of parts) {
          if (!p) continue
          if (/^\s+$/.test(p)) {
            frag.appendChild(document.createTextNode(' '))
            continue
          }
          const w = document.createElement('span')
          w.className = 'w'
          const wi = document.createElement('span')
          wi.className = 'wi'
          wi.textContent = p
          w.appendChild(wi)
          frag.appendChild(w)
        }
        child.replaceWith(frag)
      } else if (child.nodeType === 1 && !child.classList.contains('w')) {
        walk(child)
      }
    }
  }
  walk(el)
  return el.querySelectorAll('.wi')
}

export function words(el, vars = {}) {
  const ws = splitWords(el)
  return gsap.fromTo(
    ws,
    { yPercent: 110, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.06, clearProps: 'transform', ...vars },
  )
}

// Cuenta un número de 0 a su valor (data-count, data-decimals, data-sep).
export function countUp(el, vars = {}) {
  const target = parseFloat(el.dataset.count)
  const dec = parseInt(el.dataset.decimals || '0', 10)
  const sep = el.dataset.sep ?? ' '
  const from = parseFloat(el.dataset.from || '0')
  const fmt = (v) => {
    const fixed = v.toFixed(dec)
    const [i, d] = fixed.split('.')
    const int = sep ? i.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : i
    return d ? `${int}.${d}` : int
  }
  const o = { v: from }
  el.textContent = fmt(from)
  return gsap.to(o, {
    v: target,
    duration: 1.8,
    ease: 'power3.out',
    ...vars,
    onUpdate: () => (el.textContent = fmt(o.v)),
    onComplete: () => (el.textContent = fmt(target)),
  })
}

export function setCount(el) {
  const o = { v: parseFloat(el.dataset.count) }
  const dec = parseInt(el.dataset.decimals || '0', 10)
  const sep = el.dataset.sep ?? ' '
  const [i, d] = o.v.toFixed(dec).split('.')
  el.textContent = (sep ? i.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : i) + (d ? `.${d}` : '')
}

// Dibuja trazos SVG (paths/lines con clase .draw).
export function draw(els, vars = {}) {
  const list = gsap.utils.toArray(els)
  list.forEach((p) => {
    const len = p.getTotalLength ? p.getTotalLength() : 1000
    p.style.strokeDasharray = `${len}`
    p.style.strokeDashoffset = `${len}`
  })
  return gsap.to(list, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.12, ...vars })
}

export function drawDone(els) {
  gsap.utils.toArray(els).forEach((p) => {
    p.style.strokeDasharray = 'none'
    p.style.strokeDashoffset = '0'
  })
}

// Iconos de trazo (24×24) usados en varias slides.
const P = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  brain: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  docker: '<rect x="3" y="9" width="18" height="10" rx="2"/><path d="M7 9V5h4v4M11 9V5h4v4"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8ZM12 18v4"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8H7Z"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  scale: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7ZM19 7l-3 7a3 3 0 0 0 6 0l-3-7Z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 3-3 4-9.5 5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  cookie: '<path d="M21 12a9 9 0 1 1-9-9 3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3 3Z"/><circle cx="8.5" cy="10" r="1"/><circle cx="14" cy="15" r="1"/><circle cx="9" cy="16" r="1"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M18 8v8"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 11a17 17 0 0 1 11-8c0 4-1.5 8-8 11l-3-3Z"/><circle cx="15" cy="9" r="1.5"/>',
  gauge: '<path d="M3 15a9 9 0 1 1 18 0"/><path d="m12 15 4-5"/>',
  megaphone: '<path d="M3 10v4l13 5V5L3 10ZM16 8a4 4 0 0 1 0 8M6 15l1 5h3l-1-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
}

export function icon(name, cls = 'icon') {
  return `<div class="${cls}"><svg viewBox="0 0 24 24">${P[name] || ''}</svg></div>`
}

export function svgIcon(name, size = 38) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`
}
