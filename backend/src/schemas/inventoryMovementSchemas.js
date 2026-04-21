import { z } from 'zod'

const TIPOS_MOVIMIENTO = ['ENTRADA', 'SALIDA', 'AJUSTE']

export const getInventoryMovementsQuerySchema = z.object({
  id_producto: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  tipo:        z.enum(TIPOS_MOVIMIENTO).optional(),
  desde:       z.string().optional(),
  hasta:       z.string().optional(),
})

export const inventoryMovementIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The id must be a positive integer.' }),
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
