import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { DEFAULT_CURRENCY, formatMoney } from '@/utils/currency.js'

/**
 * Configuración de venta de la empresa seleccionada (moneda, IVA, descuento).
 *
 * Vive en un store y no en cada vista porque la moneda la necesitan pantallas
 * que no tienen nada que ver con el POS —dashboard, proyectos, reportes—, y
 * cada una resolviéndola por su cuenta acabaría enseñando símbolos distintos en
 * la misma sesión.
 *
 * Se cachea por empresa: cambiar de empresa invalida lo cargado, porque cada
 * una tiene la suya.
 */
export const useSaleConfigStore = defineStore('saleConfig', {
  state: () => ({
    config: {
      iva_activo: false,
      iva_tasa: 0,
      descuento_activo: false,
      descuento_max_pct: 0,
      moneda: DEFAULT_CURRENCY,
    },
    // Empresa cuya configuración está cargada; null si aún no hay ninguna.
    loadedFor: null,
    loading: false,
  }),

  getters: {
    moneda: (state) => state.config.moneda ?? DEFAULT_CURRENCY,
  },

  actions: {
    /**
     * Carga la configuración si no está ya cargada para la empresa actual.
     * `force` la recarga aunque lo esté, que es lo que hace la pantalla de
     * configuración tras guardar.
     */
    async load({ force = false } = {}) {
      const auth = useAuthStore()
      const id = auth.idEmpresaActual
      if (!id) return
      if (!force && this.loadedFor === id) return
      if (this.loading) return

      this.loading = true
      try {
        const headers = { 'X-Company-ID': id }
        if (auth.token) headers.Authorization = `Bearer ${auth.token}`
        const res = await fetch('/api/companies/sale-config', { headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        this.config = { ...this.config, ...body.data }
        this.loadedFor = id
      } catch {
        // Sin configuración se sigue con los valores por defecto: una pantalla
        // que solo enseña importes no debe quedarse en blanco porque esta
        // petición falle.
      } finally {
        this.loading = false
      }
    },

    /** Reemplaza la configuración con la que acaba de devolver un guardado. */
    apply(config) {
      const auth = useAuthStore()
      this.config = { ...this.config, ...config }
      this.loadedFor = auth.idEmpresaActual
    },

    /** Importe formateado con la moneda de la empresa. */
    money(amount, options) {
      return formatMoney(amount, this.moneda, options)
    },
  },
})
