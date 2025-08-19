import express from 'express'
import { authRequired } from '../middleware/auth.js'
import {
  getTwoFactorStatus,
  enableTwoFactor,
  disableTwoFactor,
  generateTwoFactorSecret
} from '../controllers/twoFactorController.js'

const router = express.Router()

// All routes require authentication
router.use(authRequired)

// Get two-factor status
router.get('/status', getTwoFactorStatus)

// Enable two-factor authentication
router.post('/enable', enableTwoFactor)

// Disable two-factor authentication
router.post('/disable', disableTwoFactor)

// Generate secret for authenticator app
router.post('/generate-secret', generateTwoFactorSecret)

export default router
