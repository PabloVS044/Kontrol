import { z } from 'zod'

export const proveedorIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El id debe ser un entero positivo.' }),
})

export const createProveedorSchema = z.object({
  nombre:          z.string().min(1, 'nombre es requerido.').max(255),
  contacto_nombre: z.string().max(255).optional(),
  telefono:        z.string().max(20).optional(),
  email:           z.string().email('Formato de email inválido.').optional(),
})

export const updateProveedorSchema = z
  .object({
    nombre:          z.string().min(1).max(255).optional(),
    contacto_nombre: z.string().max(255).nullable().optional(),
    telefono:        z.string().max(20).nullable().optional(),
    email:           z.string().email('Formato de email inválido.').nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No se proporcionaron campos para actualizar.',
  })
