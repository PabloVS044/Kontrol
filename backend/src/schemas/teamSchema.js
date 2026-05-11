import { z } from 'zod';

export const teamSchema = z.object({
  nombre: z.string().min(3, "Team name is too short"),
  descripcion: z.string().optional().nullable(),
  id_lider: z.coerce.number().int().positive()
});

export const teamParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
});

export const teamMemberParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

export const teamProjectParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  projectId: z.coerce.number().int().positive(),
});
