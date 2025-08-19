import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { status, accountInfo, services, fileServices, liveServices, placeOrder, placeBulkOrder } from '../controllers/dhruController.js'

const router = Router()

router.get('/status', authRequired, status)
router.get('/account-info', authRequired, accountInfo)
router.get('/services', authRequired, services)
router.get('/file-services', authRequired, fileServices)
router.get('/live-services', authRequired, liveServices)
router.post('/place-order', authRequired, placeOrder)
router.post('/place-bulk-order', authRequired, placeBulkOrder)

export default router
