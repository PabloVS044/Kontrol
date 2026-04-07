import { z } from 'zod'
import { VALID_ROLES } from './userSchemas.js'

export const registerSchema = z.object({
  nombre:     z.string().min(1, 'nombre es requerido.').max(100),
  apellido:   z.string().min(1, 'apellido es requerido.').max(100),
  email:      z.string().email('Formato de email inválido.'),
  password:   z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  role:       z.enum(VALID_ROLES, { message: `role debe ser uno de: ${VALID_ROLES.join(', ')}.` }),
  telefono:   z.string().max(20).optional(),
  id_empresa: z.number().int().positive().optional(),
})

export const loginSchema = z.object({
  email:    z.string().email('Formato de email inválido.'),
  password: z.string().min(1, 'password es requerido.'),
})
