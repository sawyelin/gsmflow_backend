import { prisma } from '../lib/prisma.js'
import NOWPaymentsService from './nowpayments.service.js'

class DepositService {
  constructor () {
    this.prisma = prisma
  }

  /**
   * Create a new deposit request
   * @param {string} userId - User ID
   * @param {number} amount - Deposit amount
   * @param {string} method - Payment method name (e.g., 'NOWPayments')
   * @param {string} currency - Currency code (e.g., 'usd')
   * @param {string} description - Deposit description
   * @param {string} payCurrency - Selected cryptocurrency (e.g., any ,btc')
   * @returns {object} - Deposit object with payment details
   */
  async createDeposit (userId, amount, method, currency = 'usd', description = null, payCurrency = 'btc') {
    try {
      // Create a deposit record with pending status
      const deposit = await this.prisma.deposit.create({
        data: {
          userId,
          amount,
          currency,
          paymentGateway: method,
          status: 'pending',
          description
        }
      })

      // If using NOWPayments, create a payment request
      if (method === 'NOWPayments') {
        // Get the NOWPayments gateway configuration
        const nowpaymentsGateway = await this.prisma.paymentGateway.findFirst({
          where: {
            name: 'NOWPayments',
            isActive: true
          }
        })

        // Create NOWPayments service with the gateway configuration
        const nowpaymentsService = new NOWPaymentsService(nowpaymentsGateway)

        // Prepare payment data
        const paymentData = {
          price_amount: amount,
          price_currency: currency,
          pay_currency: payCurrency, // Use selected cryptocurrency
          ipn_callback_url: `${process.env.BACKEND_BASE_URL}/api/deposits/ipn-callback`,
          order_id: deposit.id,
          order_description: description || `Deposit for user ${userId}`,
          is_fee_paid_by_user: true
        }

        // Create invoice using NOWPayments service for redirect URL
        const invoice = await nowpaymentsService.createInvoice(paymentData)

        // Update deposit with payment ID (from invoice.id)
        const updatedDeposit = await this.prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            paymentId: invoice.id.toString(),
            status: 'pending_payment'
          }
        })

        // Return invoice URL for redirect
        return {
          deposit: updatedDeposit,
          paymentUrl: invoice.invoice_url
        }
      }

      return { deposit }
    } catch (error) {
      console.error('Error creating deposit:', error)
      throw new Error(`Failed to create deposit: ${error.message}`)
    }
  }

  /**
   * Get user deposits
   * @param {string} userId - User ID
   * @returns {array} - Array of deposit objects
   */
  async getUserDeposits (userId) {
    try {
      const deposits = await this.prisma.deposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })

      return deposits
    } catch (error) {
      console.error('Error fetching user deposits:', error)
      throw new Error(`Failed to fetch user deposits: ${error.message}`)
    }
  }

  /**
   * Get deposit by ID
   * @param {string} depositId - Deposit ID
   * @returns {object} - Deposit object
   */
  async getDepositById (depositId) {
    try {
      const deposit = await this.prisma.deposit.findUnique({
        where: { id: depositId }
      })

      return deposit
    } catch (error) {
      console.error('Error fetching deposit:', error)
      throw new Error(`Failed to fetch deposit: ${error.message}`)
    }
  }

  /**
   * Get total deposit amount for a user
   * @param {string} userId - User ID
   * @returns {number} - Total deposit amount
   */
  async getUserTotalDeposits (userId) {
    try {
      // Calculate total from successful deposits
      const depositTotal = await this.prisma.deposit.aggregate({
        _sum: {
          amount: true
        },
        where: {
          userId,
          status: { in: ['completed', 'confirmed', 'finished'] }
        }
      })

      // Calculate total from completed FUND_ADDITION invoices
      const invoiceTotal = await this.prisma.invoice.aggregate({
        _sum: {
          amount: true
        },
        where: {
          userId,
          type: 'FUND_ADDITION',
          status: 'COMPLETED'
        }
      })

      const total = (depositTotal._sum.amount || 0) + (invoiceTotal._sum.amount || 0)
      return total
    } catch (error) {
      console.error('Error calculating total deposits:', error)
      throw new Error(`Failed to calculate total deposits: ${error.message}`)
    }
  }

  /**
   * Update deposit status
   * @param {string} depositId - Deposit ID
   * @param {string} status - New status
   * @returns {object} - Updated deposit object
   */
  async updateDepositStatus (depositId, status) {
    try {
      const deposit = await this.prisma.deposit.update({
        where: { id: depositId },
        data: { status }
      })

      return deposit
    } catch (error) {
      console.error('Error updating deposit status:', error)
      throw new Error(`Failed to update deposit status: ${error.message}`)
    }
  }

  /**
   * Process successful deposit and update user balance
   * @param {string} depositId - Deposit ID
   * @returns {object} - Updated deposit and user objects
   */
  async processSuccessfulDeposit (depositId) {
    try {
      const deposit = await this.prisma.deposit.findUnique({
        where: { id: depositId }
      })

      if (!deposit) {
        throw new Error('Deposit not found')
      }

      if (deposit.status === 'completed') {
        throw new Error('Deposit already processed')
      }

      // Update user balance
      const user = await this.prisma.user.update({
        where: { id: deposit.userId },
        data: { balance: { increment: deposit.amount } }
      })

      // Update deposit status
      const updatedDeposit = await this.prisma.deposit.update({
        where: { id: depositId },
        data: { status: 'completed' }
      })

      return { deposit: updatedDeposit, user }
    } catch (error) {
      console.error('Error processing successful deposit:', error)
      throw new Error(`Failed to process successful deposit: ${error.message}`)
    }
  }
}

export default DepositService
