import { onBeforeUnmount, onMounted, ref } from 'vue'

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
