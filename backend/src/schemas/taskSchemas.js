import { z } from 'zod'

export const VALID_ESTADOS = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA']
export const VALID_PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

export const createTaskSchema = z.object({
    nombre: z.string().min(1, 'Task name is required.'),
    descripcion: z.string().optional(),
    estado: z.enum(VALID_ESTADOS).optional(),
    prioridad: z.enum(VALID_PRIORIDADES).optional(),
    fecha_vencimiento: z.string().date('Due date must be a valid date (YYYY-MM-DD).').optional(),
    id_asignado: z.number().int().positive().optional(),
})


export const projectTaskParamsSchema = z.object({
    projectId: z.coerce.number().int().positive({ message: 'The project id must be a positive integer.' }),
    id: z.coerce.number().int().positive({ message: 'The task id must be a positive integer.' }),
})

export const updateTaskSchema = z
    .object({
    nombre:            z.string().min(1).max(200).optional(),
    descripcion:       z.string().nullable().optional(),
    estado:            z.enum(VALID_ESTADOS, { message: `Status must be one of: ${VALID_ESTADOS.join(', ')}.` }).optional(),
    prioridad:         z.enum(VALID_PRIORIDADES, { message: `Priority must be one of: ${VALID_PRIORIDADES.join(', ')}.` }).optional(),
    fecha_vencimiento: z.string().date('Due date must be a valid date (YYYY-MM-DD).').nullable().optional(),
    id_asignado:       z.number().int().positive().nullable().optional(),
    })
    .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No fields were provided for update.' }
)
