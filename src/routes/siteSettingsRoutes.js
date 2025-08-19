import { Router } from 'express'
import {
  getSiteSettings,
  updateSiteSettings
} from '../controllers/siteSettingsController.js'

import { authRequired } from '../middleware/auth.js'

const router = Router()

// Admin authorization middleware
const adminRequired = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' })
  }
  next()
}

// Apply authentication middleware to all routes
router.use(authRequired)

// Apply admin authorization middleware to all routes
router.use(adminRequired)

// Site settings routes
router.get('/site-settings', getSiteSettings)
router.put('/site-settings', updateSiteSettings)

export default router
