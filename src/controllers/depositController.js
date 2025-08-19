import { prisma } from '../lib/prisma.js'
import DepositService from '../services/deposit.service.js'
import NOWPaymentsService from '../services/nowpayments.service.js'

const depositService = new DepositService()

/**
 * Create a new deposit request
 * @route POST /api/deposits
 * @access Private
 */
export const createDeposit = async (req, res) => {
  try {
    const { amount, paymentGateway, currency, description } = req.body

    // Validate input
    if (!amount || !paymentGateway) {
      return res.status(400).json({ error: 'Amount and paymentGateway are required' })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Create deposit
    const result = await depositService.createDeposit(
      req.user.id,
      amount,
      paymentGateway,
      currency || 'usd',
      description || `Deposit via ${paymentGateway}`
    )

    res.status(201).json(result)
  } catch (error) {
    console.error('Error in createDeposit controller:', error)
    res.status(500).json({ error: 'Failed to create deposit request' })
  }
}

/**
 * Get user deposits
 * @route GET /api/deposits
 * @access Private
 */
export const getUserDeposits = async (req, res) => {
  try {
    const deposits = await depositService.getUserDeposits(req.user.id)
    res.json(deposits)
  } catch (error) {
    console.error('Error in getUserDeposits controller:', error)
    res.status(500).json({ error: 'Failed to fetch deposits' })
  }
}

/**
 * Get deposit by ID
 * @route GET /api/deposits/:id
 * @access Private
 */
export const getDepositById = async (req, res) => {
  try {
    const { id } = req.params
    const deposit = await depositService.getDepositById(id)

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' })
    }

    // Check if user owns this deposit
    if (deposit.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this deposit' })
    }

    res.json(deposit)
  } catch (error) {
    console.error('Error in getDepositById controller:', error)
    res.status(500).json({ error: 'Failed to fetch deposit' })
  }
}

/**
 * IPN callback for NOWPayments
 * @route POST /api/deposits/ipn-callback
 * @access Public
 */
export const nowpaymentsIPNCallback = async (req, res) => {
  try {
    const { depositId, paymentId, status } = req.body

    if (!depositId || !paymentId || !status) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get deposit
    const deposit = await depositService.getDepositById(depositId)

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' })
    }

    // Verify IPN callback if using NOWPayments
    if (deposit.paymentGateway === 'NOWPayments') {
      // Get the NOWPayments gateway configuration
      const nowpaymentsGateway = await prisma.paymentGateway.findFirst({
        where: {
          name: 'NOWPayments',
          isActive: true
        }
      })

      // Create NOWPayments service with the gateway configuration
      const nowpaymentsService = new NOWPaymentsService(nowpaymentsGateway)

      // Verify the callback signature
      const isValid = nowpaymentsService.verifyIPNCallback(req.body, req.headers['x-nowpayments-sig'])

      if (!isValid) {
        return res.status(400).json({ error: 'Invalid IPN callback signature' })
      }
    }

    // Update deposit status based on payment status
    let newStatus = deposit.status

    // Map NOWPayments status to our deposit status
    if (deposit.paymentGateway === 'NOWPayments') {
      switch (status) {
        case 'finished':
          newStatus = 'completed'
          break
        case 'pending':
          newStatus = 'pending_payment'
          break
        case 'confirming':
          newStatus = 'confirming'
          break
        case 'confirmed':
          newStatus = 'confirmed'
          break
        case 'sending':
          newStatus = 'sending'
          break
        case 'partially_paid':
          newStatus = 'partially_paid'
          break
        case 'failed':
          newStatus = 'failed'
          break
        default:
          newStatus = 'pending_payment'
      }
    }

    // Update deposit status
    const updatedDeposit = await depositService.updateDepositStatus(depositId, newStatus)

    // If payment is completed, update user balance
    if (newStatus === 'completed') {
      await depositService.processSuccessfulDeposit(depositId)
    }

    res.json({ success: true, deposit: updatedDeposit })
  } catch (error) {
    console.error('Error in nowpaymentsIPNCallback controller:', error)
    res.status(500).json({ error: 'Failed to process IPN callback' })
  }
}
