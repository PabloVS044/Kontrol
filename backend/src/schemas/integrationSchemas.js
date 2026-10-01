import { z } from 'zod'
import { INTEGRATION_CATALOG } from '../services/integrationService.js'

// Las claves de credencial que el catálogo declara como URL: hoy `url` y
// `webhook_url`. Derivarlas evita una lista paralela que se desincronice.
const CLAVES_URL = new Set(
  INTEGRATION_CATALOG.flatMap((integracion) =>
    integracion.campos_credenciales.filter((campo) => campo.type === 'url').map((campo) => campo.key),
  ),
)

function esUrlHttp(valor) {
  try {
    const { protocol } = new URL(valor)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * El esquema valida el formato; que el destino no sea una dirección interna lo
 * comprueba `assertPublicHttpUrl` antes de cada salida HTTP. La separación no es
 * arbitraria: `validate` usa `safeParse` síncrono y resolver DNS es asíncrono.
 */
export const saveIntegrationSchema = z
  .object({
    credentials: z.record(z.string(), z.string()).optional().default({}),
    config: z.record(z.string(), z.any()).optional().default({}),
  })
  .superRefine((data, ctx) => {
    for (const [clave, valor] of Object.entries(data.credentials ?? {})) {
      // Los valores enmascarados vuelven del formulario sin cambios y el
      // controlador ya los ignora al mezclar.
      if (!CLAVES_URL.has(clave) || !valor || valor.includes('****')) continue

      if (!esUrlHttp(valor)) {
        ctx.addIssue({
          code: 'custom',
          path: ['credentials', clave],
          message: 'Debe ser una URL http o https válida.',
        })
      }
    }
  })

export const toggleIntegrationSchema = z.object({
  status: z.enum(['active', 'inactive']),
})
