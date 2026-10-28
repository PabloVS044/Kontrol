import { z } from 'zod'

const AUTH_ROLES = ['admin', 'usuario']

const LEGAL_REQUIRED = 'You must accept the Terms and Conditions and the Privacy Policy.'

// L-6 — la casilla del alta: `accepted` solo vale `true` (nunca se da por
// supuesta) y `versions` dice qué versión de cada documento se le mostró.
export const legalAcceptanceSchema = z.object({
  accepted: z.literal(true, { message: LEGAL_REQUIRED }),
  versions: z.record(z.string().max(40), z.string().max(20)),
}, { message: LEGAL_REQUIRED })

export const registerSchema = z.object({
  nombre:     z.string().min(1, 'First name is required.').max(100),
  apellido:   z.string().min(1, 'Last name is required.').max(100),
  email:      z.string().email('Invalid email format.'),
  password:   z.string().min(8, 'Password must be at least 8 characters long.'),
  role:       z.enum(AUTH_ROLES, { message: `role must be one of: ${AUTH_ROLES.join(', ')}.` }),
  telefono:   z.string().max(20).optional(),
  id_empresa: z.number().int().positive().optional(),
  inviteToken: z.string().min(16, 'Invalid invitation token.').max(255).optional(),
  legal:      legalAcceptanceSchema,
})

export const loginSchema = z.object({
  email:    z.string().email('Invalid email format.'),
  password: z.string().min(1, 'password is required.'),
  inviteToken: z.string().min(16, 'Invalid invitation token.').max(255).optional(),
})

export const deleteOwnAccountSchema = z.object({
  password: z.string().max(200).optional(),
  google_reauth_token: z.string().min(1).max(4096).optional(),
}).refine(
  ({ password, google_reauth_token }) =>
    Boolean(password?.length) || Boolean(google_reauth_token?.length),
  { message: 'Reauthentication is required.', path: ['password'] }
)
