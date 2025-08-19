import express from 'express'
import {
  getNOWPaymentsApiStatus,
  getAvailableCurrencies,
  getMinimumPaymentAmount,
  getEstimatedPrice,
  createNOWPayment,
  getNOWPaymentStatus,
  getListOfNOWPayments,
  handleIPNCallback
} from '../controllers/nowpayments.controller.js'
import { authRequired } from '../middleware/auth.js'

const router = express.Router()

// NOWPayments API routes
router.get('/status', authRequired, getNOWPaymentsApiStatus)
router.get('/currencies', authRequired, getAvailableCurrencies)
router.get('/min-amount', authRequired, getMinimumPaymentAmount)
router.get('/estimate', authRequired, getEstimatedPrice)
router.post('/payment', authRequired, createNOWPayment)
router.get('/payment/:paymentId', authRequired, getNOWPaymentStatus)
router.get('/payments', authRequired, getListOfNOWPayments)
router.post('/ipn-callback', handleIPNCallback)

export default router
