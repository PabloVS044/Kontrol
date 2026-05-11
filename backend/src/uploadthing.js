import jwt from 'jsonwebtoken'
import { createRouteHandler, createUploadthing } from 'uploadthing/express'

const f = createUploadthing()

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
}

export default createRouteHandler({
  router: uploadRouter,
  config: {
    isDev: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev',
  },
})
