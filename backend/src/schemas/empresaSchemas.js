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

export const createEmpresaSchema = z.object({
  nombre: z.string().min(1, 'nombre es requerido.').max(255),
  industria: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  direccion: z.string().optional(),
})

export const empresaInvitationTokenParamSchema = z.object({
  token: z.string().min(16, 'Token de invitación inválido.').max(255),
})

export const empresaMemberParamSchema = z.object({
  id_usuario: z.coerce.number().int().positive('El id del usuario debe ser válido.'),
})

export const updateEmpresaMemberRoleSchema = z.object({
  rol: z.string().min(1, 'El rol es requerido.').max(50),
})

export const empresaMemberProjectParamsSchema = z.object({
  id_usuario: z.coerce.number().int().positive('El id del usuario debe ser válido.'),
  id_proyecto: z.coerce.number().int().positive('El id del proyecto debe ser válido.'),
})

export const updateEmpresaMemberProjectAccessSchema = z.object({
  permisos: z.array(
    z.enum(PROJECT_PERMISSION_NAMES, {
      message: `Cada permiso debe ser uno de: ${PROJECT_PERMISSION_NAMES.join(', ')}.`,
    })
  ).optional().default([]),
})
