import { z } from 'zod'

const AUTH_ROLES = ['admin', 'usuario']

export const registerSchema = z.object({
  nombre:     z.string().min(1, 'First name is required.').max(100),
  apellido:   z.string().min(1, 'Last name is required.').max(100),
  email:      z.string().email('Invalid email format.'),
  password:   z.string().min(8, 'Password must be at least 8 characters long.'),
  role:       z.enum(AUTH_ROLES, { message: `role must be one of: ${AUTH_ROLES.join(', ')}.` }),
  telefono:   z.string().max(20).optional(),
  id_empresa: z.number().int().positive().optional(),
  inviteToken: z.string().min(16, 'Invalid invitation token.').max(255).optional(),
})

export const loginSchema = z.object({
  email:    z.string().email('Invalid email format.'),
  password: z.string().min(1, 'password is required.'),
  inviteToken: z.string().min(16, 'Invalid invitation token.').max(255).optional(),
})
