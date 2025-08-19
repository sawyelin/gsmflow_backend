import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { createDeposit, getUserDeposits, getDepositById, nowpaymentsIPNCallback } from '../controllers/depositController.js'

const router = Router()

// Create a new deposit request
router.post('/', authRequired, createDeposit)

// Get user deposits
router.get('/', authRequired, getUserDeposits)

// Get deposit by ID
router.get('/:id', authRequired, getDepositById)

// NOWPayments IPN callback
router.post('/ipn-callback', nowpaymentsIPNCallback)

export default router
