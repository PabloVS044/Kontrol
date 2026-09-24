import { createRouter } from '../middleware/asyncHandler.js'
import validate from '../middleware/validate.js'
import requireAuth from '../middleware/requireAuth.js'
import { loginIpLimiter, loginAccountLimiter } from '../middleware/rateLimit.js'
import { registerSchema, loginSchema } from '../schemas/authSchemas.js'
import { login, register, getMe, googleAuth, googleCallback } from '../controllers/authController.js'

const router = createRouter()

router.post('/register', validate(registerSchema), register)
router.post('/login',    loginIpLimiter, validate(loginSchema), loginAccountLimiter, login)
router.get('/me',        requireAuth,              getMe)

router.get('/google',          googleAuth)
router.get('/google/callback', googleCallback)

export default router
