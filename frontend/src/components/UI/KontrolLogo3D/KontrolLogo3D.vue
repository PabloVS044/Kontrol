<template>
  <div ref="containerRef" class="kontrol-logo-3d" :style="{ width, height }">
    <canvas ref="canvasRef" class="kontrol-logo-3d__canvas" />
    <div v-if="!loaded" class="kontrol-logo-3d__fallback">
      <img src="@/assets/img/kontrol.png" alt="Kontrol" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const props = defineProps({
  src: { type: String, default: '/kontrol-logo.glb' },
  width: { type: String, default: '420px' },
  height: { type: String, default: '420px' },
  intensity: { type: Number, default: 0.45 },     // max rad rotation from mouse
  damping: { type: Number, default: 0.08 },        // 0..1, lerp factor per frame
  idleSpinSpeed: { type: Number, default: 0.08 }, // rad/s while no input
  scale: { type: Number, default: 1.0 },
  baseRotationY: { type: Number, default: Math.PI }, // flip 180° by default
  baseRotationX: { type: Number, default: 0 },
  // Extra rotation/scale driven from outside (e.g. a GSAP ScrollTrigger scrub
  // tweening a reactive object) — added on top of the mouse-follow/idle
  // motion below rather than replacing it.
  scrollRotationY: { type: Number, default: 0 },
  scrollScale: { type: Number, default: 1 },
})

const containerRef = ref(null)
const canvasRef = ref(null)
const loaded = ref(false)

const ctx = shallowRef({
  renderer: null, scene: null, camera: null, model: null,
  raf: 0, ro: null, lastT: 0,
  target: { x: 0, y: 0 }, cur: { x: 0, y: 0 },
  hadInput: false,
})

function onMouseMove(e) {
  const el = containerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  // Center on viewport rather than element so logo reacts to whole screen
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const nx = (e.clientX - cx) / cx   // -1..1
  const ny = (e.clientY - cy) / cy
  ctx.value.target.x = nx * props.intensity
  ctx.value.target.y = ny * props.intensity
  ctx.value.hadInput = true
  void r
}

function fitCamera() {
  const c = ctx.value
  if (!c.renderer || !c.camera || !containerRef.value) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  c.renderer.setSize(w, h, false)
  c.camera.aspect = w / h
  c.camera.updateProjectionMatrix()
}

function tick(t) {
  const c = ctx.value
  if (!c.renderer) return
  const dt = c.lastT ? (t - c.lastT) / 1000 : 0
  c.lastT = t

  if (c.model) {
    // Idle subtle yaw before user moves cursor
    if (!c.hadInput) {
      c.target.x = Math.sin(t * 0.0006) * 0.18
      c.target.y = Math.cos(t * 0.0005) * 0.08
    }
    c.cur.x += (c.target.x - c.cur.x) * props.damping
    c.cur.y += (c.target.y - c.cur.y) * props.damping
    c.model.rotation.y = props.baseRotationY + c.cur.x + props.scrollRotationY
    c.model.rotation.x = props.baseRotationX + c.cur.y
    c.model.scale.setScalar(props.scrollScale)
    // Tiny constant breathing
    c.model.position.y = Math.sin(t * 0.0012) * 0.04
    void dt
  }

  c.renderer.render(c.scene, c.camera)
  c.raf = requestAnimationFrame(tick)
}

onMounted(async () => {
  const canvas = canvasRef.value
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.LinearToneMapping
  renderer.toneMappingExposure = 1.6

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 5)

  // Strong, warm-balanced lighting so dark gold model reads well
  const ambient = new THREE.AmbientLight(0xffffff, 0.9)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0xfff1cf, 0x2a1a05, 1.2)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xffe2a8, 3.4)
  key.position.set(2.5, 2.5, 3.5)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0xffffff, 1.6)
  rim.position.set(-3, 1.2, -2)
  scene.add(rim)

  const fill = new THREE.PointLight(0xffc870, 2.2, 14)
  fill.position.set(-1.8, -1.2, 2.5)
  scene.add(fill)

  const front = new THREE.DirectionalLight(0xffffff, 0.9)
  front.position.set(0, 0, 4)
  scene.add(front)

  ctx.value.renderer = renderer
  ctx.value.scene = scene
  ctx.value.camera = camera

  fitCamera()

  ctx.value.ro = new ResizeObserver(fitCamera)
  ctx.value.ro.observe(containerRef.value)
  window.addEventListener('mousemove', onMouseMove, { passive: true })

  try {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(props.src)
    const model = gltf.scene
    // Boost material brightness if originals look too dark
    model.traverse(o => {
      if (o.isMesh && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach(m => {
          if ('envMapIntensity' in m) m.envMapIntensity = 1.4
          if ('emissive' in m && m.emissive) {
            m.emissive = new THREE.Color(0x2a1a05)
            m.emissiveIntensity = 0.35
          }
          if ('metalness' in m) m.metalness = Math.min(m.metalness ?? 0.6, 0.85)
          if ('roughness' in m) m.roughness = Math.max(m.roughness ?? 0.3, 0.25)
          m.needsUpdate = true
        })
      }
    })
    // Center + normalize size
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3(); box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    model.position.sub(center)
    const maxDim = Math.max(size.x, size.y, size.z)
    const target = 2.2 * props.scale
    if (maxDim > 0) model.scale.setScalar(target / maxDim)

    // Wrap so we can rotate around centered origin
    const pivot = new THREE.Group()
    pivot.add(model)
    scene.add(pivot)
    ctx.value.model = pivot
    loaded.value = true
  } catch (err) {
    console.error('[KontrolLogo3D] Failed to load model:', err)
  }

  ctx.value.raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  const c = ctx.value
  cancelAnimationFrame(c.raf)
  window.removeEventListener('mousemove', onMouseMove)
  c.ro?.disconnect()
  if (c.model) {
    c.model.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach(m => {
          for (const k in m) {
            if (m[k] && m[k].isTexture) m[k].dispose()
          }
          m.dispose?.()
        })
      }
    })
  }
  c.renderer?.dispose()
})
</script>

<style scoped>
.kontrol-logo-3d {
  position: relative;
  max-width: 100%;
}
.kontrol-logo-3d::before {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(202, 168, 96, 0.55) 0%, rgba(202, 168, 96, 0.18) 40%, transparent 70%);
  filter: blur(40px);
  z-index: -1;
  pointer-events: none;
}
.kontrol-logo-3d__canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.kontrol-logo-3d__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.kontrol-logo-3d__fallback img {
  width: 80%;
  opacity: 0.5;
}
</style>
