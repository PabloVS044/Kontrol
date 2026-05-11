import { z } from 'zod'

export const VALID_TIPOS_REPORTE = ['AVANCE', 'PRESUPUESTO', 'INCIDENTE', 'CONSOLIDADO']

export const createReportSchema = z.object({
  titulo:        z.string().min(1, 'Title is required.').max(200),
  tipo:          z.enum(VALID_TIPOS_REPORTE, { message: `Type must be one of: ${VALID_TIPOS_REPORTE.join(', ')}.` }),
  contenido_url: z.string().url('Must be a valid URL.').optional().nullable(),
  id_proyecto:   z.number().int().positive('Project ID must be a positive integer.'),
})

export const updateReportSchema = z
  .object({
    titulo:        z.string().min(1).max(200).optional(),
    tipo:          z.enum(VALID_TIPOS_REPORTE, { message: `Type must be one of: ${VALID_TIPOS_REPORTE.join(', ')}.` }).optional(),
    contenido_url: z.string().url('Must be a valid URL.').nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No fields were provided for update.' }
  )

export const reportIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Report ID must be a positive integer.' }),
})
