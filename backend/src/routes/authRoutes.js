import { createRouter } from '../middleware/asyncHandler.js'
import validate from '../middleware/validate.js'
import requireAuth from '../middleware/requireAuth.js'
import { loginIpLimiter, loginAccountLimiter } from '../middleware/rateLimit.js'
import { registerSchema, loginSchema, deleteOwnAccountSchema } from '../schemas/authSchemas.js'
import {
  login,
  register,
  getMe,
  googleAuth,
  googleCallback,
  googleDeletionReauthentication,
} from '../controllers/authController.js'

const router = createRouter()

router.post('/register', validate(registerSchema), register)
router.post('/login',    loginIpLimiter, validate(loginSchema), loginAccountLimiter, login)
router.get('/me',        requireAuth,              getMe)
router.delete('/account', requireAuth, validate(deleteOwnAccountSchema), async (req, res) => {
  const { deleteOwnAccount } = await import('../controllers/privacyController.js')
  return deleteOwnAccount(req, res)
})

router.get('/google',          googleAuth)
router.post('/google/reauth-for-deletion', requireAuth, googleDeletionReauthentication)
router.get('/google/callback', googleCallback)

export default router
