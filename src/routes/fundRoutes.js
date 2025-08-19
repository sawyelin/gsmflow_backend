import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { getBalance, addFunds, listInvoices, payInvoice, getTotalDeposits, getNowPaymentsCurrencies } from '../controllers/fundsController.js'

const router = Router()

router.get('/balance', authRequired, getBalance)
router.post('/add', authRequired, addFunds)
router.get('/invoices', authRequired, listInvoices)
router.post('/invoices/:id/pay', authRequired, payInvoice)
router.get('/total-deposits', authRequired, getTotalDeposits)
router.get('/nowpayments-currencies', authRequired, getNowPaymentsCurrencies)

export default router
