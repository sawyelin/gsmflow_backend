import express from 'express'
import {
  getPaymentGateways,
  getPaymentGatewayById,
  createPaymentGateway,
  updatePaymentGateway,
  deletePaymentGateway,
  getDefaultPaymentGateway,
  getNOWPaymentsStatus,
  getNOWPaymentsCurrencies,
  createNOWPayment,
  getNOWPaymentStatus,
  getAvailableNOWPaymentGateways
} from '../controllers/paymentGatewayController.js'
import { authRequired } from '../middleware/auth.js'

const router = express.Router()

// Get all payment gateways
router.get('/', getPaymentGateways)

// Get a specific payment gateway by ID
router.get('/:id', getPaymentGatewayById)

// Create a new payment gateway
router.post('/', createPaymentGateway)

// Update a payment gateway
router.put('/:id', updatePaymentGateway)

// Delete a payment gateway
router.delete('/:id', deletePaymentGateway)

// Get the default payment gateway
router.get('/default', getDefaultPaymentGateway)

// NOWPayments specific routes
router.get('/nowpayments/status', authRequired, getNOWPaymentsStatus)
router.get('/nowpayments/currencies', authRequired, getNOWPaymentsCurrencies)
router.get('/nowpayments/gateways', authRequired, getAvailableNOWPaymentGateways)
router.post('/nowpayments/payment', authRequired, createNOWPayment)
router.get('/nowpayments/payment/:paymentId', authRequired, getNOWPaymentStatus)

export default router
