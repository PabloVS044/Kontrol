// Logo K en 3D (el mismo .glb de la app). Un solo renderer que se mueve
// entre las slides que lo piden; si no hay WebGL, se usa el PNG.

export class Logo3D {
  constructor() {
    this.ready = null
    this.container = null
    this.running = false
  }

  async init() {
    const THREE = await import('three')
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0, 6)
    const key = new THREE.DirectionalLight(0xffe2a8, 2.4)
    key.position.set(3, 4, 5)
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.3))

    const gltf = await new GLTFLoader().loadAsync('media/kontrol-logo.glb')
    const model = gltf.scene
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    model.position.sub(center)
    const pivot = new THREE.Group()
    pivot.add(model)
    pivot.scale.setScalar(2.4 / Math.max(size.x, size.y, size.z))
    scene.add(pivot)

    Object.assign(this, { THREE, renderer, scene, camera, pivot, baseScale: pivot.scale.x })
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
  }

  async mount(container, { animate = true } = {}) {
    if (!container) return this.unmount()
    this.container = container
    try {
      this.ready ??= this.init()
      await this.ready
    } catch (err) {
      console.warn('Logo 3D no disponible, se usa PNG', err)
      if (!container.querySelector('img'))
        container.innerHTML = '<img src="media/kontrol.png" alt="Kontrol" style="width:100%;height:100%;object-fit:contain">'
      return
    }
    if (this.container !== container) return
    const { renderer, camera } = this
    container.appendChild(renderer.domElement)
    // Medidas en px del lienzo de 1920×1080 (sin el escalado de la pantalla)
    const w = container.offsetWidth
    const h = container.offsetHeight
    renderer.setSize(w * 1.5, h * 1.5, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    this.t0 = performance.now()
    this.intro = animate ? 1 : 0
    if (!this.running) {
      this.running = true
      this.loop()
    }
  }

  unmount() {
    this.container = null
    this.running = false
    this.renderer?.domElement.remove()
  }

  loop() {
    if (!this.running) return
    const t = (performance.now() - this.t0) / 1000
    const { pivot } = this
    // Entrada: gira y crece durante 2.2 s, luego oscila suave
    const k = this.intro ? Math.min(1, t / 2.2) : 1
    const e = 1 - Math.pow(1 - k, 4)
    const s = 0.2 + 0.8 * e
    // El .glb mira hacia -Z: medio giro extra para que la K se vea de frente
    pivot.rotation.y = Math.PI + (1 - e) * Math.PI * 2.5 + Math.sin(t * 0.6) * 0.45
    pivot.rotation.x = Math.sin(t * 0.4) * 0.08
    pivot.position.y = Math.sin(t * 0.9) * 0.05
    pivot.scale.setScalar(this.baseScale * s)
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(() => this.loop())
  }
}
