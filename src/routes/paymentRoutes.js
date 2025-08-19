import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { createInvoiceWithPayment, getPaymentStatus, nowpaymentsIPNCallback } from '../controllers/payments.controller.js'

const router = Router()

// Create an invoice with payment gateway integration
router.post('/invoice', authRequired, createInvoiceWithPayment)

// Get payment status for an invoice
router.get('/status/:invoiceId', authRequired, getPaymentStatus)

// NOWPayments IPN callback
router.post('/nowpayments/ipn-callback', nowpaymentsIPNCallback)

export default router
