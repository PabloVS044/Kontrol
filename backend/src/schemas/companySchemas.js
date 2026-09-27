import { z } from 'zod'

export const PROJECT_PERMISSION_NAMES = [
  'ver_inventario',
  'gestionar_inventario',
  'editar_proyecto',
  'gestionar_tareas',
  'asignar_usuarios',
  'gestionar_presupuesto',
  'crear_reportes',
]

export const createCompanySchema = z.object({
  nombre: z.string().min(1, 'Company name is required.').max(255),
  industria: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  direccion: z.string().optional(),
})

export const companyInvitationTokenParamSchema = z.object({
  token: z.string().min(16, 'Invalid invitation token.').max(255),
})

export const companyMemberParamSchema = z.object({
  userId: z.coerce.number().int().positive('The user id must be valid.'),
})

export const updateCompanyMemberRoleSchema = z.object({
  rol: z.string().min(1, 'Role is required.').max(50),
})

export const companyMemberProjectParamsSchema = z.object({
  userId: z.coerce.number().int().positive('The user id must be valid.'),
  projectId: z.coerce.number().int().positive('The project id must be valid.'),
})

export const updateCompanyMemberProjectAccessSchema = z.object({
  permisos: z.array(
    z.enum(PROJECT_PERMISSION_NAMES, {
      message: `Each permission must be one of: ${PROJECT_PERMISSION_NAMES.join(', ')}.`,
    })
  ).optional().default([]),
})

/**
 * Configuración del POS de la empresa: IVA y descuento.
 *
 * Todos los campos son opcionales para permitir un PATCH parcial (activar solo
 * el IVA sin tocar el descuento). La tasa se expresa como fracción —0.12 es el
 * 12%— y el tope de descuento como porcentaje, igual que en la tabla.
 */
export const updateCompanySaleConfigSchema = z.object({
  iva_activo: z.boolean().optional(),
  iva_tasa: z.coerce
    .number()
    .min(0, 'The tax rate cannot be negative.')
    .max(1, 'The tax rate is a fraction: 0.12 means 12%.')
    .optional(),
  descuento_activo: z.boolean().optional(),
  descuento_max_pct: z.coerce
    .number()
    .min(0, 'The maximum discount cannot be negative.')
    .max(100, 'The maximum discount cannot exceed 100%.')
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Send at least one setting to update.',
})
