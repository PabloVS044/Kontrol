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
