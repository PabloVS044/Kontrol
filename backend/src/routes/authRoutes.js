import { Router } from 'express'
import validate from '../middleware/validate.js'
import { registerSchema, loginSchema } from '../schemas/authSchemas.js'
import { login, register, googleAuth, googleCallback, getMe } from '../controllers/authController.js'
import requireAuth from '../middleware/requireAuth.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login',    validate(loginSchema),    login)

router.get('/google',          googleAuth)
router.get('/google/callback', googleCallback)
router.get('/me',              requireAuth, getMe)

export default router
