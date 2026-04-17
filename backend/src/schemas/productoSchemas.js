import { z } from 'zod'

export const getProductosQuerySchema = z.object({
  categoria:   z.coerce.number().int().positive().optional(),
  stock_bajo:  z.enum(['true', 'false']).optional(),
  id_proyecto: z.coerce.number().int().positive().optional(),
})

export const productoIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El id debe ser un entero positivo.' }),
})

export const productoProveedorParamsSchema = z.object({
  id:  z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
})

export const createProductoSchema = z.object({
  nombre:        z.string().min(1, 'nombre es requerido.').max(255),
  descripcion:   z.string().optional(),
  precio_venta:  z.number().min(0, 'precio_venta debe ser >= 0.'),
  precio_costo:  z.number().min(0, 'precio_costo debe ser >= 0.'),
  stock_minimo:  z.number().int().min(0).optional().default(0),
  stock_inicial: z.number().int().min(0).optional().default(0),
  id_categoria:  z.number().int().positive().optional(),
})

export const updateProductoSchema = z
  .object({
    nombre:       z.string().min(1).max(255).optional(),
    descripcion:  z.string().nullable().optional(),
    precio_venta: z.number().min(0).optional(),
    precio_costo: z.number().min(0).optional(),
    stock_minimo: z.number().int().min(0).optional(),
    id_categoria: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No se proporcionaron campos para actualizar.',
  })

export const linkProveedorSchema = z.object({
  id_proveedor:  z.number().int().positive(),
  precio_unitario: z.number().min(0, 'precio_unitario debe ser >= 0.'),
})

export const updateLinkProveedorSchema = z
  .object({
    precio_unitario:         z.number().min(0).optional(),
    fecha_ultima_cotizacion: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No se proporcionaron campos para actualizar.',
  })
