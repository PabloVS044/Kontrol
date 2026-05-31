<template>
  <Teleport to="body">
    <div ref="wrapRef" class="csa-wrap">
      <canvas ref="canvasRef" class="csa-canvas" />
      <div ref="overlayRef" class="csa-content">
        <p class="csa-text">Conexión exitosa</p>
        <button class="csa-btn" @click="handleAccept">Aceptar</button>
      </div>
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
const wrapRef   = ref(null)
const overlayRef = ref(null)

const S = { modelOpacity: 0, checkGreen: 0, emissiveBoost: 2.4 }

let renderer, scene, camera, raf
let allMats = []
let checkMats = []

function updateCam() {
  if (!camera) return
  camera.position.set(0, 0, 5.5)
  camera.lookAt(0, 0.9, 0)
}

function tick() {
  raf = requestAnimationFrame(tick)

  for (const m of allMats) {
    m.opacity = S.modelOpacity
    m.emissiveIntensity = S.emissiveBoost
  }

  if (S.checkGreen > 0) {
    for (const m of checkMats) {
      m.color.setRGB(
        THREE.MathUtils.lerp(0.80, 0.13, S.checkGreen),
        THREE.MathUtils.lerp(0.66, 0.88, S.checkGreen),
        THREE.MathUtils.lerp(0.38, 0.35, S.checkGreen),
      )
      m.emissive.setRGB(
        0,
        THREE.MathUtils.lerp(0.05, 0.55, S.checkGreen),
        THREE.MathUtils.lerp(0.0,  0.12, S.checkGreen),
      )
    }
  }

  renderer?.render(scene, camera)
}

function runTimeline() {
  const tl = gsap.timeline()
  tl.to(S, { modelOpacity: 1, emissiveBoost: 0.4, duration: 0.9, ease: 'power2.out' }, 0)
  tl.to(S, { checkGreen: 1, duration: 0.8, ease: 'power1.inOut' }, 1.1)
  tl.to(overlayRef.value, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 2.1)
}

function handleAccept() {
  gsap.to(wrapRef.value, {
    opacity: 0,
    duration: 0.45,
    ease: 'power1.in',
    onComplete: () => emit('done'),
  })
}

onMounted(async () => {
  const canvas = canvasRef.value

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.9
  renderer.setSize(window.innerWidth, window.innerHeight, false)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100)
  updateCam()

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

  try {
    const gltf = await new GLTFLoader().loadAsync('/kontrol-logo.glb')
    const model = gltf.scene

    const box = new THREE.Box3().setFromObject(model)
    const sz  = new THREE.Vector3(); box.getSize(sz)
    const ctr = new THREE.Vector3(); box.getCenter(ctr)
    model.position.sub(ctr)
    const maxDim = Math.max(sz.x, sz.y, sz.z)
    if (maxDim > 0) model.scale.setScalar(2.2 / maxDim)

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
        m.needsUpdate       = true
        allMats.push(m)
        meshList.push({ mesh: o, mat: m })
      })
    })

    const byName = meshList.filter(({ mesh: o }) => /check|tick|mark|hook|arrow/i.test(o.name))
    if (byName.length) {
      checkMats = byName.map(x => x.mat)
    } else {
      meshList.sort((a, b) => {
        const la = a.mat.color ? a.mat.color.r + a.mat.color.g + a.mat.color.b : 0
        const lb = b.mat.color ? b.mat.color.r + b.mat.color.g + b.mat.color.b : 0
        return lb - la
      })
      checkMats = meshList.slice(0, Math.max(1, Math.ceil(meshList.length * 0.4))).map(x => x.mat)
    }

    const pivot = new THREE.Group()
    pivot.rotation.y = Math.PI
    pivot.position.y = 0.9
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
  if (wrapRef.value)    gsap.killTweensOf(wrapRef.value)
  if (overlayRef.value) gsap.killTweensOf(overlayRef.value)
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
  pointer-events: all;
}

.csa-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.csa-content {
  position: absolute;
  bottom: 14%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  opacity: 0;
  transform: translateY(10px);
  pointer-events: all;
}

.csa-text {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin: 0;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
}

.csa-btn {
  padding: 10px 32px;
  border-radius: 8px;
  border: none;
  background: var(--Primary, #caa860);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.csa-btn:hover {
  opacity: 0.85;
}
</style>
