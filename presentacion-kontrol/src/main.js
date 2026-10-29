import gsap from 'gsap'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/playfair-display/600-italic.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles.css'
import './slides.css'
import './minis.css'

import { SLIDES } from './slides/index.js'
import { animIn, words, countUp, setCount, draw, drawDone } from './fx.js'
import { Logo3D } from './logo3d.js'

const params = new URLSearchParams(location.search)
const PREVIEW = params.has('preview')
if (PREVIEW) document.body.classList.add('preview')

const stage = document.getElementById('stage')
const slidesEl = document.getElementById('slides')
const sweep = document.getElementById('sweep')
const blackout = document.getElementById('blackout')
const gotoEl = document.getElementById('goto')

const logo3d = new Logo3D()
// Cargar Three.js y el .glb en segundo plano para que la primera slide con el logo no dé un tirón
;(window.requestIdleCallback || setTimeout)(() => {
  logo3d.ready ??= logo3d.init()
})

// ---------- Montaje ----------

const els = SLIDES.map((s, i) => {
  const sec = document.createElement('section')
  sec.className = `slide ${s.layout || ''}`.trim()
  sec.dataset.id = s.id
  sec.dataset.index = i
  sec.innerHTML = s.html
  slidesEl.appendChild(sec)
  s.steps ??= Math.max(0, ...[...sec.querySelectorAll('[data-step]')].map((e) => +e.dataset.step))
  s.el = sec
  return sec
})

for (const v of stage.querySelectorAll('video')) {
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  const device = v.closest('.device')
  if (device) v.addEventListener('loadeddata', () => device.classList.add('loaded'))
  if (v.dataset.loop) {
    const [a, b] = v.dataset.loop.split(',').map(Number)
    v.addEventListener('timeupdate', () => {
      if (v.currentTime >= b) v.currentTime = a
    })
  }
}

function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080)
  stage.style.transform = `translate(-50%, -50%) scale(${s})`
}
addEventListener('resize', fit)
fit()

// ---------- Estado ----------

let index = -1
let step = 0
let enterTl = null

const outsideSteps = (root, sel) => [...root.querySelectorAll(sel)].filter((e) => !e.closest('[data-step]'))
const insideStep = (stepEl, sel) =>
  [...stepEl.querySelectorAll(sel)].filter((e) => e.closest('[data-step]') === stepEl)

function playVideos(list) {
  if (PREVIEW) {
    list.forEach((v) => {
      const t = parseFloat(v.dataset.previewTime || v.dataset.start || '1')
      v.addEventListener('loadedmetadata', () => (v.currentTime = t), { once: true })
      if (v.readyState >= 1) v.currentTime = t
    })
    return
  }
  list.forEach((v) => {
    try {
      v.currentTime = parseFloat(v.dataset.start || '0')
    } catch {}
    v.playbackRate = parseFloat(v.dataset.rate || '1')
    v.play().catch(() => {})
  })
}

function stopVideos(el) {
  el.querySelectorAll('video').forEach((v) => v.pause())
}

function buildEntrance(slide, el) {
  const tl = gsap.timeline()
  let t = 0.15
  const ins = outsideSteps(el, '[data-in]')
  ins.forEach((node) => {
    const kind = node.dataset.in
    const at = node.dataset.delay != null ? parseFloat(node.dataset.delay) : t
    if (kind === 'words') tl.add(words(node), at)
    else tl.add(animIn(node, kind), at)
    if (node.dataset.delay == null) t += kind === 'words' ? 0.28 : 0.11
  })
  outsideSteps(el, '[data-count]').forEach((n) => tl.add(countUp(n), parseFloat(n.dataset.delay ?? 0.4)))
  const paths = outsideSteps(el, '.draw')
  if (paths.length) tl.add(draw(paths), 0.3)
  if (slide.enter) slide.enter(el, tl)
  return tl
}

function revealStep(slide, el, k, animate) {
  el.querySelectorAll(`[data-step="${k}"]`).forEach((node) => {
    gsap.set(node, { visibility: 'visible' })
    const inner = insideStep(node, '[data-in]')
    const counts = insideStep(node, '[data-count]')
    const paths = insideStep(node, '.draw')
    const vids = insideStep(node, 'video[data-autoplay]')
    if (!animate) {
      gsap.set(node, { opacity: 1, clearProps: 'transform,filter' })
      counts.forEach(setCount)
      drawDone(paths)
      return
    }
    const kind = node.dataset.anim || 'up'
    if (kind === 'words') words(node)
    else if (kind !== 'none') animIn(node, kind)
    else gsap.set(node, { opacity: 1 })
    inner.forEach((n, i) => (n.dataset.in === 'words' ? words(n, { delay: 0.1 + i * 0.1 }) : animIn(n, n.dataset.in, { delay: 0.12 + i * 0.1 })))
    counts.forEach((n) => countUp(n, { delay: 0.2 }))
    if (paths.length) draw(paths, { delay: 0.15 })
    playVideos(vids)
  })
  slide.onStep?.(k, el, animate)
}

function hideSteps(slide, el, fromK) {
  el.querySelectorAll('[data-step]').forEach((node) => {
    if (+node.dataset.step >= fromK) {
      gsap.killTweensOf(node)
      gsap.set(node, { opacity: 0, visibility: 'hidden' })
      node.querySelectorAll('video').forEach((v) => v.pause())
    }
  })
}

/**
 * Lleva el deck a la slide `i` en el paso `s`.
 * animate=false deja todo en su estado final (preview, retrocesos y saltos).
 */
function go(i, s = 0, { animate = true, broadcast = true } = {}) {
  i = Math.max(0, Math.min(SLIDES.length - 1, i))
  const slide = SLIDES[i]
  s = Math.max(0, Math.min(slide.steps, s))

  if (i === index) {
    if (s === step) return
    if (s > step) for (let k = step + 1; k <= s; k++) revealStep(slide, slide.el, k, animate)
    else {
      hideSteps(slide, slide.el, s + 1)
      slide.onStep?.(s, slide.el, false)
    }
    step = s
    sync(broadcast)
    return
  }

  const prev = SLIDES[index]
  if (prev) {
    enterTl?.progress(1).kill()
    stopVideos(prev.el)
    prev.leave?.(prev.el)
    const out = prev.el
    if (animate) {
      gsap.to(out, {
        opacity: 0,
        scale: 0.99,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          out.classList.remove('active')
          gsap.set(out, { clearProps: 'all' })
        },
      })
    } else {
      out.classList.remove('active')
      gsap.set(out, { clearProps: 'all' })
    }
    if (animate && prev.section !== slide.section && i > index) sectionSweep()
  }

  const el = slide.el
  const forward = i > index
  index = i
  step = s
  gsap.killTweensOf(el)
  gsap.set(el, { clearProps: 'all' })
  el.classList.add('active')
  hideSteps(slide, el, 1)

  if (slide.logo3d) logo3d.mount(el.querySelector(slide.logo3d), { animate: animate && forward })
  else logo3d.unmount()

  const fullAnim = animate && forward
  if (animate) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: prev ? 0.25 : 0 })
  enterTl = buildEntrance(slide, el)
  if (fullAnim) enterTl.delay(prev ? 0.3 : 0.1)
  else enterTl.progress(1)

  playVideos(outsideSteps(el, 'video[data-autoplay]'))
  for (let k = 1; k <= s; k++) revealStep(slide, el, k, false)
  sync(broadcast)
}

function sectionSweep() {
  gsap.fromTo(
    sweep,
    { opacity: 1, xPercent: -100 },
    { xPercent: 100, duration: 1.1, ease: 'power2.inOut', onComplete: () => gsap.set(sweep, { opacity: 0 }) },
  )
}

function next() {
  const slide = SLIDES[index]
  if (step < slide.steps) go(index, step + 1)
  else if (index < SLIDES.length - 1) go(index + 1, 0)
}

function prev() {
  if (step > 0) go(index, step - 1, { animate: false })
  else if (index > 0) go(index - 1, SLIDES[index - 1].steps, { animate: false })
}

// ---------- Sincronía con la vista de presentador ----------

const channel = !PREVIEW && 'BroadcastChannel' in window ? new BroadcastChannel('kontrol-deck') : null

function sync(broadcast) {
  if (PREVIEW) return
  history.replaceState(null, '', `#${index + 1}.${step}`)
  if (broadcast) channel?.postMessage({ type: 'state', index, step })
}

channel?.addEventListener('message', ({ data }) => {
  if (data.type === 'go') {
    const target = data.index
    const fwd = target > index || (target === index && data.step > step)
    go(target, data.step, { animate: fwd && target - index <= 1 })
  } else if (data.type === 'next') next()
  else if (data.type === 'prev') prev()
  else if (data.type === 'hello') channel.postMessage({ type: 'state', index, step })
  else if (data.type === 'black') blackout.classList.toggle('on')
  else if (data.type === 'video') toggleVideo()
})

function toggleVideo() {
  const vids = [...SLIDES[index].el.querySelectorAll('video')].filter((v) => v.offsetParent !== null)
  vids.forEach((v) => (v.paused ? v.play() : v.pause()))
}

// ---------- Teclado (incluye clickers: PageUp/PageDown/B/.) ----------

let gotoBuf = ''
addEventListener('keydown', (e) => {
  if (PREVIEW) return
  const k = e.key
  if (/^[0-9]$/.test(k)) {
    gotoBuf += k
    gotoEl.textContent = `Ir a ${gotoBuf}`
    gotoEl.classList.add('on')
    return
  }
  if (k === 'Enter' && gotoBuf) {
    go(parseInt(gotoBuf, 10) - 1, 0, { animate: true })
    gotoBuf = ''
    gotoEl.classList.remove('on')
    return
  }
  if (k === 'Escape') {
    gotoBuf = ''
    gotoEl.classList.remove('on')
    return
  }
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) {
    e.preventDefault()
    next()
  } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) {
    e.preventDefault()
    prev()
  } else if (k === 'Home') go(0, 0, { animate: false })
  else if (k === 'End') go(SLIDES.length - 1, 0, { animate: false })
  else if (k === 'f' || k === 'F') {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  } else if (k === 'b' || k === 'B' || k === '.') blackout.classList.toggle('on')
  else if (k === 'v' || k === 'V' || k === 'k' || k === 'K') toggleVideo()
  else if (k === 'p' || k === 'P') window.open('presenter.html', 'kontrol-presenter', 'width=1400,height=860')
  else if (k === 'r' || k === 'R') replay()
})

function replay() {
  const i = index
  index = -1
  go(i, 0)
}

let cursorTimer
addEventListener('mousemove', () => {
  document.body.classList.add('show-cursor')
  clearTimeout(cursorTimer)
  cursorTimer = setTimeout(() => document.body.classList.remove('show-cursor'), 1800)
})

// ---------- Arranque ----------

function parseHash() {
  const m = location.hash.match(/^#(\d+)(?:\.(\d+))?/)
  return m ? [parseInt(m[1], 10) - 1, parseInt(m[2] || '0', 10)] : [0, 0]
}

document.fonts.ready.then(() => {
  const [i, s] = parseHash()
  go(i, s, { animate: !PREVIEW && i === 0 && s === 0, broadcast: true })
  if (PREVIEW) {
    addEventListener('hashchange', () => {
      const [pi, ps] = parseHash()
      go(pi, ps, { animate: false })
    })
  }
})

window.__deck = { go, next, prev, get state() { return { index, step } }, slides: SLIDES }
