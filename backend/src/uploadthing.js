import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { createRouteHandler, createUploadthing } from 'uploadthing/express'
import pool from './db/pool.js'

const f = createUploadthing()

function evidenceTypeFromMime(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'IMAGEN'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType === 'application/pdf') return 'DOCUMENTO'
  return 'OTRO'
}

function getAttachmentType(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

export const uploadRouter = {
  chatAttachment: f({
    image: { maxFileSize: '8MB', maxFileCount: 6 },
    video: { maxFileSize: '64MB', maxFileCount: 2 },
    audio: { maxFileSize: '32MB', maxFileCount: 4 },
    pdf: { maxFileSize: '16MB', maxFileCount: 6 },
    text: { maxFileSize: '4MB', maxFileCount: 6 },
    blob: { maxFileSize: '32MB', maxFileCount: 6 },
  })
    .middleware(({ req }) => {
      const authHeader = req.headers.authorization

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token required.')
      }

      const token = authHeader.slice(7)

      try {
        const user = jwt.verify(token, process.env.JWT_SECRET)
        return { userId: user.id_usuario }
      } catch {
        throw new Error('Invalid or expired token.')
      }
    })
    .onUploadComplete(({ file }) => ({
      type: getAttachmentType(file.type),
      url: file.ufsUrl,
      publicId: file.key,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    })),

  taskEvidence: f({
    image: { maxFileSize: '8MB', maxFileCount: 3 },
    video: { maxFileSize: '64MB', maxFileCount: 1 },
    pdf: { maxFileSize: '16MB', maxFileCount: 3 },
    blob: { maxFileSize: '16MB', maxFileCount: 3 },
  })
    .input(z.object({
      taskId: z.coerce.number().int().positive(),
      progressEntryId: z.coerce.number().int().positive().optional(),
      descripcion: z.string().max(500).optional(),
    }))
    .middleware(async ({ req, input }) => {
      const authHeader = req.headers.authorization

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token required.')
      }

      const token = authHeader.slice(7)
      let user

      try {
        user = jwt.verify(token, process.env.JWT_SECRET)
      } catch {
        throw new Error('Invalid or expired token.')
      }

      const task = await pool.query(
        'SELECT id_tarea FROM public.tarea WHERE id_tarea = $1',
        [input.taskId]
      )

      if (!task.rows.length) {
        throw new Error('Task not found.')
      }

      return {
        userId: user.id_usuario,
        taskId: input.taskId,
        progressEntryId: input.progressEntryId ?? null,
        descripcion: input.descripcion ?? null,
      }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      const result = await pool.query(
        `INSERT INTO public.evidencia
          (descripcion, url_archivo, tipo_archivo, id_tarea, id_usuario, public_id, id_progress_entry)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_evidencia`,
        [
          metadata.descripcion,
          file.ufsUrl,
          evidenceTypeFromMime(file.type),
          metadata.taskId,
          metadata.userId,
          file.key,
          metadata.progressEntryId,
        ]
      )

      return { idEvidencia: result.rows[0].id_evidencia, url: file.ufsUrl }
    }),
}

export default createRouteHandler({
  router: uploadRouter,
  config: {
    isDev: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev',
  },
})
