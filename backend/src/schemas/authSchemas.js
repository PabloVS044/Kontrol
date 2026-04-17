import { z } from 'zod'

const AUTH_ROLES = ['admin', 'usuario']

export const registerSchema = z.object({
  nombre:     z.string().min(1, 'nombre es requerido.').max(100),
  apellido:   z.string().min(1, 'apellido es requerido.').max(100),
  email:      z.string().email('Formato de email inválido.'),
  password:   z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  role:       z.enum(AUTH_ROLES, { message: `role debe ser uno de: ${AUTH_ROLES.join(', ')}.` }),
  telefono:   z.string().max(20).optional(),
  id_empresa: z.number().int().positive().optional(),
  inviteToken: z.string().min(16, 'Token de invitación inválido.').max(255).optional(),
})

export const loginSchema = z.object({
  email:    z.string().email('Formato de email inválido.'),
  password: z.string().min(1, 'password es requerido.'),
  inviteToken: z.string().min(16, 'Token de invitación inválido.').max(255).optional(),
})
