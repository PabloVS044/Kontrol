// @vitest-environment node
// vite.config.js resuelve el alias con `import.meta.url`, que bajo happy-dom
// no es una URL `file:`.
import { describe, it, expect } from 'vitest'
import { manualChunks } from '../vite.config.js'

const nm = (path) => `/repo/node_modules/${path}`

describe('vite.config — separación de chunks (DT-17)', () => {
  it('manda cada librería de animación a su propio chunk', () => {
    expect(manualChunks(nm('ogl/src/core/Renderer.js'))).toBe('vendor-ogl')
    expect(manualChunks(nm('gsap/index.js'))).toBe('vendor-gsap')
    expect(manualChunks(nm('gsap/ScrollTrigger.js'))).toBe('vendor-gsap')
    expect(manualChunks(nm('lenis/dist/lenis.mjs'))).toBe('vendor-lenis')
  })

  it('parte three en el núcleo y el resto, incluidos sus addons', () => {
    expect(manualChunks(nm('three/build/three.core.js'))).toBe('vendor-three-core')
    expect(manualChunks(nm('three/build/three.module.js'))).toBe('vendor-three')
    expect(manualChunks(nm('three/examples/jsm/loaders/GLTFLoader.js'))).toBe('vendor-three')
  })

  it('deja el resto de dependencias y el código de la app a Rollup', () => {
    expect(manualChunks(nm('vue/dist/vue.runtime.esm-bundler.js'))).toBeUndefined()
    expect(manualChunks(nm('vue-i18n/dist/vue-i18n.mjs'))).toBeUndefined()
    expect(manualChunks(nm('@zxing/library/esm/index.js'))).toBeUndefined()
    expect(manualChunks('/repo/frontend/src/App.vue')).toBeUndefined()
  })

  it('no confunde paquetes con nombre parecido', () => {
    expect(manualChunks(nm('three-stdlib/index.js'))).toBeUndefined()
    expect(manualChunks(nm('gsap-trial/index.js'))).toBeUndefined()
  })
})
