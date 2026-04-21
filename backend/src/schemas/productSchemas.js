import { z } from 'zod'

export const getProductsQuerySchema = z.object({
  categoria:   z.coerce.number().int().positive().optional(),
  stock_bajo:  z.enum(['true', 'false']).optional(),
  projectId: z.coerce.number().int().positive().optional(),
})

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The id must be a positive integer.' }),
})

export const productSupplierParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  supplierId: z.coerce.number().int().positive(),
})

export const createProductSchema = z.object({
  nombre:        z.string().min(1, 'Product name is required.').max(255),
  descripcion:   z.string().optional(),
  precio_venta:  z.number().min(0, 'Sale price must be >= 0.'),
  precio_costo:  z.number().min(0, 'Cost price must be >= 0.'),
  stock_minimo:  z.number().int().min(0).optional().default(0),
  stock_inicial: z.number().int().min(0).optional().default(0),
  id_categoria:  z.number().int().positive().optional(),
})

export const updateProductSchema = z
  .object({
    nombre:       z.string().min(1).max(255).optional(),
    descripcion:  z.string().nullable().optional(),
    precio_venta: z.number().min(0).optional(),
    precio_costo: z.number().min(0).optional(),
    stock_minimo: z.number().int().min(0).optional(),
    id_categoria: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields were provided for update.',
  })

export const linkSupplierSchema = z.object({
  id_proveedor:  z.number().int().positive(),
  precio_unitario: z.number().min(0, 'Unit price must be >= 0.'),
})

export const updateSupplierLinkSchema = z
  .object({
    precio_unitario:         z.number().min(0).optional(),
    fecha_ultima_cotizacion: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields were provided for update.',
  })
