import { Router } from 'express'
import validate from '../middleware/validate.js'
import requireAuth from '../middleware/requireAuth.js'
import { registerSchema, loginSchema } from '../schemas/authSchemas.js'
import { login, register, getMe, googleAuth, googleCallback } from '../controllers/authController.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login',    validate(loginSchema),    login)
router.get('/me',        requireAuth,              getMe)

router.get('/google',          googleAuth)
router.get('/google/callback', googleCallback)

export default router
