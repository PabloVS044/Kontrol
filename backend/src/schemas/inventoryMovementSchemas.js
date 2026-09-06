import { z } from 'zod'

const TIPOS_MOVIMIENTO = ['ENTRADA', 'SALIDA', 'AJUSTE']

/**
 * Zona horaria IANA del cliente: "America/Guatemala", "Europe/Madrid"…
 *
 * Los rangos `desde`/`hasta` llegan en hora local del navegador mientras que
 * `movimiento_inventario.fecha` guarda hora UTC; sin esta zona el filtro se
 * desplaza justo el desfase horario. El nombre viaja siempre como parámetro de
 * la consulta, nunca interpolado en el SQL, y el patrón acota la forma para que
 * un valor absurdo se rechace aquí y no en el motor.
 */
const tzSchema = z.string().regex(/^[A-Za-z0-9_+\-/]{1,64}$/).optional()

export const getInventoryMovementsQuerySchema = z.object({
  id_producto: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  tipo:        z.enum(TIPOS_MOVIMIENTO).optional(),
  desde:       z.string().optional(),
  hasta:       z.string().optional(),
  tz:          tzSchema,
})

export const getInventorySalesStatsQuerySchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  desde:     z.string().optional(),
  hasta:     z.string().optional(),
  bucket:    z.enum(['hour', 'day', 'week', 'month']).optional(),
  tz:        tzSchema,
})

export const inventoryMovementIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The id must be a positive integer.' }),
})

export const createSaleSchema = z.object({
  motivo: z.string().optional(),
  items: z
    .array(
      z.object({
        id_producto:     z.number().int().positive(),
        id_proyecto:     z.number().int().positive(),
        cantidad:        z.number().int().positive(),
        precio_unitario: z.number().min(0).optional().default(0),
      })
    )
    .min(1, { message: 'The sale must have at least one item.' }),
})

export const createInventoryMovementSchema = z.object({
  tipo:            z.enum(TIPOS_MOVIMIENTO, { message: `Type must be one of: ${TIPOS_MOVIMIENTO.join(', ')}.` }),
  cantidad:        z.number().int().positive({ message: 'Quantity must be a positive integer.' }),
  precio_unitario: z.number().min(0).optional().default(0),
  motivo:          z.string().optional(),
  id_producto:     z.number().int().positive(),
  id_proyecto:     z.number().int().positive(),
  id_proveedor:    z.number().int().positive().optional(),
})
