import { z } from 'zod'

export const supplierIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The id must be a positive integer.' }),
})

export const createSupplierSchema = z.object({
  nombre:          z.string().min(1, 'Supplier name is required.').max(255),
  contacto_nombre: z.string().max(255).optional(),
  telefono:        z.string().max(20).optional(),
  email:           z.string().email('Invalid email format.').optional(),
})

export const updateSupplierSchema = z
  .object({
    nombre:          z.string().min(1).max(255).optional(),
    contacto_nombre: z.string().max(255).nullable().optional(),
    telefono:        z.string().max(20).nullable().optional(),
    email:           z.string().email('Invalid email format.').nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields were provided for update.',
  })
