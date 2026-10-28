import { ref } from 'vue'
import { apiFetch as requestApi, authHeaders } from '@/services/api.js'
import { useAuthStore } from '@/stores/auth'

/**
 * Proyectos cuyo inventario puede ver el usuario, para los selectores de
 * Inventario y del historial de ventas. Misma regla que Cobrar: quien gestiona
 * el inventario de la empresa ve todos; el resto, los de `inventory_project_ids`.
 */
export function useInventoryProjects() {
  const authStore = useAuthStore()
  const projects = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      const res = await requestApi('/api/projects?limit=100', { headers: authHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const all = (await res.json()).data ?? []
      const visible = authStore.accessContext?.inventory_project_ids ?? []
      projects.value = authStore.canManageInventory
        ? all
        : all.filter((project) => visible.includes(project.id_proyecto))
    } catch {
      // El selector se queda con "Todos los proyectos": la tabla sigue funcionando.
      projects.value = []
    } finally {
      loading.value = false
    }
  }

  return { projects, loading, load }
}
