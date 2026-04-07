import { z } from 'zod'

const TIPOS_MOVIMIENTO = ['ENTRADA', 'SALIDA', 'AJUSTE']

export const getMovimientosQuerySchema = z.object({
  id_producto: z.coerce.number().int().positive().optional(),
  id_proyecto: z.coerce.number().int().positive().optional(),
  tipo:        z.enum(TIPOS_MOVIMIENTO).optional(),
  desde:       z.string().optional(),
  hasta:       z.string().optional(),
})

export const movimientoIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El id debe ser un entero positivo.' }),
})

export const createMovimientoSchema = z.object({
  tipo:            z.enum(TIPOS_MOVIMIENTO, { message: `tipo debe ser uno de: ${TIPOS_MOVIMIENTO.join(', ')}.` }),
  cantidad:        z.number().int().positive({ message: 'cantidad debe ser un entero positivo.' }),
  precio_unitario: z.number().min(0).optional().default(0),
  motivo:          z.string().optional(),
  id_producto:     z.number().int().positive(),
  id_proyecto:     z.number().int().positive(),
  id_proveedor:    z.number().int().positive().optional(),
})
