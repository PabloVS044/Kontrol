import { z } from 'zod'

export const VALID_ROLES = ['admin', 'manager', 'collaborator']

/**
 * Query params for GET /api/users
 */
export const getUsersQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(100).optional().default(20),
  role:   z.enum(VALID_ROLES).optional(),
  activo: z.enum(['true', 'false']).optional(),
})

/**
 * Route param :id shared by GET/:id, PUT/:id, DELETE/:id
 */
export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El id debe ser un entero positivo.' }),
})

/**
 * Body for POST /api/users
 */
export const createUserSchema = z.object({
  nombre:     z.string().min(1, 'nombre es requerido.').max(100),
  apellido:   z.string().min(1, 'apellido es requerido.').max(100),
  email:      z.string().email('Formato de email inválido.'),
  password:   z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  role:       z.enum(VALID_ROLES, { message: `role debe ser uno de: ${VALID_ROLES.join(', ')}.` }),
  telefono:   z.string().max(20).optional(),
  id_empresa: z.number().int().positive().optional(),
})

/**
 * Body for PUT /api/users/:id  (all fields optional, but at least one required)
 */
export const updateUserSchema = z
  .object({
    nombre:     z.string().min(1).max(100).optional(),
    apellido:   z.string().min(1).max(100).optional(),
    email:      z.string().email('Formato de email inválido.').optional(),
    role:       z.enum(VALID_ROLES, { message: `role debe ser uno de: ${VALID_ROLES.join(', ')}.` }).optional(),
    telefono:   z.string().max(20).nullable().optional(),
    id_empresa: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No se proporcionaron campos para actualizar.' }
  )
