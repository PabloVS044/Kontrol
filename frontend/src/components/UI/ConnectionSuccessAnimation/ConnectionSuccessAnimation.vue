<template>
  <Teleport to="body">
    <div ref="wrapRef" class="csa-wrap">
      <canvas ref="canvasRef" class="csa-canvas" />
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import gsap from 'gsap'

const emit = defineEmits(['done'])
const canvasRef = ref(null)
const wrapRef = ref(null)

// Animated state — plain object mutated by GSAP each frame
const S = {
  dustOpacity: 0,
  modelOpacity: 0,
  emissiveBoost: 2.8,
  theta: 0,     // camera horizontal orbit angle (radians)
  phi: 0.06,    // camera vertical orbit angle (radians)
  radius: 3.2,  // camera distance from origin
  checkGreen: 0,
}

let renderer, scene, camera, raf, lastT = 0
let pivot = null
let dustPoints = null
let dustPos = null
const dustVel = []
let allMats = []
let checkMats = []
let disint = null // { points, geo, mat, posArr, vel, active, elapsed }

// ── Ambient dust particles ──────────────────────────────────────────────────

function initDust(n = 320) {
  dustPos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const t = Math.random() * Math.PI * 2
    const p = Math.acos(2 * Math.random() - 1)
    const r = 1.8 + Math.random() * 2.8
    dustPos[i * 3]     = Math.sin(p) * Math.cos(t) * r
    dustPos[i * 3 + 1] = Math.cos(p) * r
    dustPos[i * 3 + 2] = Math.sin(p) * Math.sin(t) * r
    dustVel.push(
      (Math.random() - .5) * .005,
      (Math.random() - .5) * .005,
      (Math.random() - .5) * .005,
    )
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  dustPoints = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xcaa860, size: 0.016, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }))
  scene.add(dustPoints)
}

// ── Energy rays (particle streams) ──────────────────────────────────────────

function spawnRay(angle = 0, color = 0xffcc00, n = 120, zOff = 0.12) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  // Place particles spread along the ray direction, starting off-screen
  const pos = new Float32Array(n * 3)
  const vel = []
  const spread = 0.09  // perpendicular spread

  for (let i = 0; i < n; i++) {
    const t  = (i / n) * 7 - 5            // -5..2 along ray axis (start off left)
    const perp = (Math.random() - .5) * spread
    pos[i * 3]     =  cos * t - sin * perp
    pos[i * 3 + 1] =  sin * t + cos * perp
    pos[i * 3 + 2] = zOff + (Math.random() - .5) * 0.06
    // All particles move in the ray direction at similar speed + slight random
    const speed = 5.5 + Math.random() * 2
    vel.push(cos * speed, sin * speed, 0)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    color, size: 0.04, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })
  const pts = new THREE.Points(geo, mat)
  scene.add(pts)

  let el = 0
  const duration = 0.7
  const step = () => {
    el += 0.016
    for (let i = 0; i < n; i++) {
      pos[i * 3]     += vel[i * 3]     * 0.016
      pos[i * 3 + 1] += vel[i * 3 + 1] * 0.016
      pos[i * 3 + 2] += vel[i * 3 + 2] * 0.016
    }
    geo.attributes.position.needsUpdate = true
    // Fade in fast, fade out slow
    mat.opacity = el < 0.08
      ? el / 0.08 * 0.9
      : Math.max(0, 0.9 - (el - 0.08) / (duration - 0.08))
    if (el < duration) requestAnimationFrame(step)
    else { scene.remove(pts); geo.dispose(); mat.dispose() }
  }
  requestAnimationFrame(step)

  spawnSparks(new THREE.Vector3(0, 0, 0.4), color, 52)
}

function spawnBigRay() {
  const n = 220
  const pos = new Float32Array(n * 3)
  const vel = []

  for (let i = 0; i < n; i++) {
    // Start all particles off the left side, staggered along X
    const x = -8 + (i / n) * 9
    const spreadY = (Math.random() - .5) * 0.38
    const spreadZ = (Math.random() - .5) * 0.12
    pos[i * 3]     = x
    pos[i * 3 + 1] = spreadY
    pos[i * 3 + 2] = -0.6 + spreadZ
    const speed = 18 + Math.random() * 6
    vel.push(speed, (Math.random() - .5) * 0.5, 0)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xff9900, size: 0.055, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })
  const pts = new THREE.Points(geo, mat)
  scene.add(pts)

  let el = 0
  const duration = 0.55
  const step = () => {
    el += 0.016
    for (let i = 0; i < n; i++) {
      pos[i * 3]     += vel[i * 3]     * 0.016
      pos[i * 3 + 1] += vel[i * 3 + 1] * 0.016
    }
    geo.attributes.position.needsUpdate = true
    mat.opacity = el < 0.06
      ? el / 0.06
      : Math.max(0, 1 - (el - 0.06) / (duration - 0.06))
    if (el < duration) requestAnimationFrame(step)
    else { scene.remove(pts); geo.dispose(); mat.dispose() }
  }
  requestAnimationFrame(step)

  spawnSparks(new THREE.Vector3(0, 0, 0.3), 0xffaa00, 95)
}

// ── Spark bursts ─────────────────────────────────────────────────────────────

function spawnSparks(origin, color, n = 48) {
  const pos = new Float32Array(n * 3)
  const vel = []
  for (let i = 0; i < n; i++) {
    pos[i * 3]     = origin.x + (Math.random() - .5) * .42
    pos[i * 3 + 1] = origin.y + (Math.random() - .5) * .42
    pos[i * 3 + 2] = origin.z + (Math.random() - .5) * .28
    vel.push(
      (Math.random() - .5) * .065,
      (Math.random() - .5) * .065 + .02,
      (Math.random() - .5) * .065,
    )
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    color, size: 0.038, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const pts = new THREE.Points(geo, mat)
  scene.add(pts)

  let el = 0
  const step = () => {
    el += 0.016
    for (let i = 0; i < n; i++) {
      pos[i * 3]     += vel[i * 3]
      pos[i * 3 + 1] += vel[i * 3 + 1]
      pos[i * 3 + 2] += vel[i * 3 + 2]
    }
    geo.attributes.position.needsUpdate = true
    mat.opacity = Math.max(0, 0.9 - el * 1.9)
    if (el < 0.48) requestAnimationFrame(step)
    else { scene.remove(pts); geo.dispose(); mat.dispose() }
  }
  requestAnimationFrame(step)
}

// ── Disintegration particle system ───────────────────────────────────────────

function buildDisint() {
  if (!pivot) return
  pivot.updateWorldMatrix(true, true)
  const positions = []
  const vel = []

  pivot.traverse(o => {
    if (!o.isMesh || !o.geometry) return
    const attr = o.geometry.attributes.position
    const wm = o.matrixWorld
    const step = Math.max(1, Math.floor(attr.count / 130))
    for (let i = 0; i < attr.count; i += step) {
      const v = new THREE.Vector3(attr.getX(i), attr.getY(i), attr.getZ(i)).applyMatrix4(wm)
      positions.push(v.x, v.y, v.z)
      const d = v.clone().normalize()
      vel.push(
        d.x * (.38 + Math.random() * .52) + (Math.random() - .5) * .28,
        d.y * (.38 + Math.random() * .52) + (Math.random() - .5) * .28 + .09,
        d.z * (.38 + Math.random() * .52) + (Math.random() - .5) * .28,
      )
    }
  })

  const posArr = new Float32Array(positions)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xcaa860, size: 0.022, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  disint = {
    points: new THREE.Points(geo, mat),
    geo, mat, posArr, vel,
    active: false,
    elapsed: 0,
  }
  scene.add(disint.points)
}

// ── Camera ───────────────────────────────────────────────────────────────────

function updateCam() {
  if (!camera) return
  camera.position.set(
    Math.sin(S.theta) * Math.cos(S.phi) * S.radius,
    Math.sin(S.phi) * S.radius,
    Math.cos(S.theta) * Math.cos(S.phi) * S.radius,
  )
  camera.lookAt(0, 0, 0)
}

// ── Render loop ──────────────────────────────────────────────────────────────

function tick(t) {
  raf = requestAnimationFrame(tick)
  const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016
  lastT = t

  // Dust drift
  if (dustPos) {
    dustPoints.material.opacity = S.dustOpacity
    const n = dustVel.length / 3
    for (let i = 0; i < n; i++) {
      dustPos[i * 3]     += dustVel[i * 3]
      dustPos[i * 3 + 1] += dustVel[i * 3 + 1]
      dustPos[i * 3 + 2] += dustVel[i * 3 + 2]
      const dx = dustPos[i * 3], dy = dustPos[i * 3 + 1], dz = dustPos[i * 3 + 2]
      if (dx * dx + dy * dy + dz * dz > 22) {
        dustPos[i * 3] *= -.9; dustPos[i * 3 + 1] *= -.9; dustPos[i * 3 + 2] *= -.9
      }
    }
    dustPoints.geometry.attributes.position.needsUpdate = true
  }

  // Model reveal — opacity + emissive glow
  for (const m of allMats) {
    m.opacity = S.modelOpacity
    m.emissiveIntensity = S.emissiveBoost
  }

  // Check mesh → green transition
  if (S.checkGreen > 0) {
    const g = S.checkGreen
    for (const m of checkMats) {
      m.color.setRGB(
        THREE.MathUtils.lerp(0.80, 0.0, g),
        THREE.MathUtils.lerp(0.66, 1.0, g),
        THREE.MathUtils.lerp(0.38, 0.4, g),
      )
      m.emissive.setRGB(
        0,
        THREE.MathUtils.lerp(0.05, 0.7, g),
        THREE.MathUtils.lerp(0.0,  0.15, g),
      )
      m.emissiveIntensity = THREE.MathUtils.lerp(S.emissiveBoost, 3.0, g)
    }
  }

  // Disintegration
  if (disint?.active) {
    disint.elapsed += dt
    const { posArr, vel, geo, mat } = disint
    const n = posArr.length / 3
    for (let i = 0; i < n; i++) {
      posArr[i * 3]     += vel[i * 3]     * dt
      posArr[i * 3 + 1] += vel[i * 3 + 1] * dt
      posArr[i * 3 + 2] += vel[i * 3 + 2] * dt
    }
    geo.attributes.position.needsUpdate = true
    mat.opacity = Math.max(0, 1 - disint.elapsed / 1.6)
    if (pivot && disint.elapsed > 0.08) pivot.visible = false
  }

  updateCam()
  renderer?.render(scene, camera)
}

// ── GSAP timeline ─────────────────────────────────────────────────────────────

function runTimeline() {
  const tl = gsap.timeline()

  // ─ Phase 1: Emergence (0 – 4 s) ─────────────────────────────────────────
  tl.to(S, { dustOpacity: 0.55,  duration: 2.2, ease: 'power1.in'    }, 0)
  tl.to(S, { modelOpacity: 1,    duration: 3.5, ease: 'power2.in'    }, 0.7)
  tl.to(S, { emissiveBoost: 0.35,duration: 3.6, ease: 'power1.inOut' }, 0.7)
  // Camera starts zoomed in and slowly pulls back
  tl.to(S, { radius: 5.5, duration: 4.0, ease: 'power2.out' }, 0)

  // ─ Phase 2: Dynamic orbit (4 – 10 s) ────────────────────────────────────
  tl.to(S, { theta: -.65, phi:  .22, radius: 4.6, duration: 1.8, ease: 'power1.inOut' }, 4.0)
  tl.to(S, { theta: -1.3, phi:  .04, radius: 3.9, duration: 1.8, ease: 'power1.inOut' }, 5.8)
  tl.to(S, { theta:  .75, phi:  .18, radius: 4.4, duration: 2.0, ease: 'power1.inOut' }, 7.6)
  tl.to(S, { theta:  0,   phi:  .06, radius: 5.5, duration: 1.6, ease: 'power2.inOut' }, 9.4)

  // Energy ray impacts
  tl.call(() => spawnRay(0,             0xffcc00), [], 4.7)
  tl.call(() => spawnRay(Math.PI / 6,   0xffaa00), [], 6.1)
  tl.call(() => spawnRay(-Math.PI / 7,  0xffdd55), [], 7.7)
  tl.call(() => spawnRay(Math.PI / 4.5, 0xffcc00), [], 9.0)

  // ─ Phase 3: Resolution (10 – 13 s) ──────────────────────────────────────
  // Zoom out to show full logo
  tl.to(S, { radius: 6.8, phi: .04, theta: 0, duration: 2.2, ease: 'power2.out' }, 10.0)
  // Check fades to vibrant green
  tl.to(S, { checkGreen: 1, duration: 2.0, ease: 'power1.inOut' }, 10.5)
  // Wide energy ray passes behind K
  tl.call(() => spawnBigRay(), [], 12.3)
  // Trigger disintegration
  tl.call(() => { buildDisint(); if (disint) disint.active = true }, [], 12.6)

  // ─ Phase 4: Fade out (13 – 14 s) ────────────────────────────────────────
  tl.to(wrapRef.value, { opacity: 0, duration: 1.1, ease: 'power1.in' }, 13.0)
  tl.call(() => emit('done'), [], 14.2)
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  const canvas = canvasRef.value

  renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.9
  renderer.setSize(window.innerWidth, window.innerHeight, false)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100)
  updateCam()

  // Lighting (mirrors KontrolLogo3D for material consistency)
  scene.add(new THREE.AmbientLight(0xffffff, 0.75))
  scene.add(new THREE.HemisphereLight(0xfff1cf, 0x2a1a05, 1.1))
  const key = new THREE.DirectionalLight(0xffe2a8, 3.4)
  key.position.set(2.5, 3, 3.5)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xffffff, 1.5)
  rim.position.set(-3, 1, -2)
  scene.add(rim)
  const fill = new THREE.PointLight(0xffc870, 2.2, 14)
  fill.position.set(-1.8, -1.2, 2.5)
  scene.add(fill)
  const front = new THREE.DirectionalLight(0xffffff, 0.9)
  front.position.set(0, 0, 4)
  scene.add(front)

  initDust()

  try {
    const gltf = await new GLTFLoader().loadAsync('/kontrol-logo.glb')
    const model = gltf.scene

    // Center and normalize size
    const box = new THREE.Box3().setFromObject(model)
    const sz  = new THREE.Vector3(); box.getSize(sz)
    const ctr = new THREE.Vector3(); box.getCenter(ctr)
    model.position.sub(ctr)
    const maxDim = Math.max(sz.x, sz.y, sz.z)
    if (maxDim > 0) model.scale.setScalar(2.2 / maxDim)

    // Collect and configure all materials
    const meshList = []
    model.traverse(o => {
      if (!o.isMesh) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach(m => {
        m.transparent       = true
        m.opacity           = 0
        m.metalness         = Math.min(m.metalness  ?? 0.6, 0.9)
        m.roughness         = Math.max(m.roughness  ?? 0.3, 0.22)
        m.emissive          = new THREE.Color(0x2a1a05)
        m.emissiveIntensity = S.emissiveBoost
        m.envMapIntensity   = 1.5
        m.needsUpdate       = true
        allMats.push(m)
        meshList.push({ mesh: o, mat: m })
      })
    })

    // Identify check meshes by name first, then by brightness heuristic
    const byName = meshList.filter(({ mesh: o }) =>
      /check|tick|mark|hook|arrow/i.test(o.name)
    )
    if (byName.length) {
      checkMats = byName.map(x => x.mat)
    } else {
      meshList.sort((a, b) => {
        const la = a.mat.color ? a.mat.color.r + a.mat.color.g + a.mat.color.b : 0
        const lb = b.mat.color ? b.mat.color.r + b.mat.color.g + b.mat.color.b : 0
        return lb - la
      })
      checkMats = meshList
        .slice(0, Math.max(1, Math.ceil(meshList.length * 0.4)))
        .map(x => x.mat)
    }

    pivot = new THREE.Group()
    pivot.rotation.y = Math.PI
    pivot.add(model)
    scene.add(pivot)
  } catch (e) {
    console.error('[ConnectionSuccessAnimation] GLB load error:', e)
  }

  raf = requestAnimationFrame(tick)
  runTimeline()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  gsap.killTweensOf(S)
  if (wrapRef.value) gsap.killTweensOf(wrapRef.value)
  scene?.traverse(o => {
    o.geometry?.dispose()
    ;[o.material].flat().forEach(m => {
      if (!m) return
      for (const k in m) if (m[k]?.isTexture) m[k].dispose()
      m.dispose?.()
    })
  })
  renderer?.dispose()
})
</script>

<style scoped>
.csa-wrap {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #111111;
  pointer-events: none;
}

.csa-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
