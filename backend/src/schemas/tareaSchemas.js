import { z } from 'zod'

export const VALID_ESTADOS = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA']
export const VALID_PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

export const createTareaSchema = z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    descripcion: z.string().optional(),
    estado: z.enum(VALID_ESTADOS).optional(),
    prioridad: z.enum(VALID_PRIORIDADES).optional(),
    fecha_vencimiento: z.string().date('fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD).').optional(),
    id_asignado: z.number().int().positive().optional(),
})


export const projectTareaParamsSchema = z.object({
    id_proyecto: z.coerce.number().int().positive({ message: 'El id_proyecto debe ser un entero positivo.' }),
    id:          z.coerce.number().int().positive({ message: 'El id debe ser un entero positivo.' }),
})

export const updateTareaSchema = z
    .object({
    nombre:            z.string().min(1).max(200).optional(),
    descripcion:       z.string().nullable().optional(),
    estado:            z.enum(VALID_ESTADOS, { message: `estado debe ser uno de: ${VALID_ESTADOS.join(', ')}.` }).optional(),
    prioridad:         z.enum(VALID_PRIORIDADES, { message: `prioridad debe ser uno de: ${VALID_PRIORIDADES.join(', ')}.` }).optional(),
    fecha_vencimiento: z.string().date('fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD).').nullable().optional(),
    id_asignado:       z.number().int().positive().optional(),
    })
    .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No se proporcionaron campos para actualizar.' }
)
