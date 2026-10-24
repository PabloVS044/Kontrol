import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Pasa a `true` la primera vez que `target` se acerca al viewport y deja de
 * observar. Lo usan los componentes WebGL para no descargar su motor hasta
 * que hacen falta (DT-17). Sin IntersectionObserver lo da por visible.
 */
export function useVisibleOnce(target, { rootMargin = '200px', enabled = true } = {}) {
  const visible = ref(false)
  let observer = null

  onMounted(() => {
    if (!enabled) return
    if (typeof IntersectionObserver === 'undefined') {
      visible.value = true
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        visible.value = true
        observer.disconnect()
        observer = null
      },
      { rootMargin }
    )
    observer.observe(target.value)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return visible
}
