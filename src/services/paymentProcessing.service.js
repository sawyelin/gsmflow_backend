import { prisma } from '../lib/prisma.js'
import NOWPaymentsService from './nowpayments.service.js'

class PaymentProcessingService {
  constructor () {
    this.prisma = prisma
  }

  /**
   * Create an invoice with payment gateway integration
   * @param {string} userId - User ID
   * @param {number} amount - Invoice amount
   * @param {string} type - Invoice type (FUND_ADDITION, SERVICE_PAYMENT, REFUND)
   * @param {string} description - Invoice description
   * @param {string} paymentGateway - Payment gateway name
   * @returns {object} - Invoice object with payment details
   */
  async createInvoiceWithPayment (userId, amount, type, description, paymentGateway) {
    try {
      // Create an invoice with pending status
      const invoice = await this.prisma.invoice.create({
        data: {
          userId,
          amount,
          type,
          status: 'PENDING',
          description
        }
      })

      // If a payment gateway is specified, create a payment request
      if (paymentGateway) {
        const paymentResult = await this.processPayment(invoice.id, amount, paymentGateway)

        // Update invoice with payment details if needed
        if (paymentResult.paymentId) {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              // We might want to add paymentId to the invoice model in the future
            }
          })
        }

        return {
          invoice,
          paymentUrl: paymentResult.paymentUrl,
          paymentId: paymentResult.paymentId
        }
      }

      return { invoice }
    } catch (error) {
      console.error('Error creating invoice with payment:', error)
      throw new Error(`Failed to create invoice: ${error.message}`)
    }
  }

  /**
   * Process payment through specified gateway
   * @param {string} invoiceId - Invoice ID
   * @param {number} amount - Payment amount
   * @param {string} paymentGateway - Payment gateway name
   * @returns {object} - Payment processing result
   */
  async processPayment (invoiceId, amount, paymentGateway) {
    try {
      switch (paymentGateway) {
        case 'NOWPayments':
          return await this.processNOWPayments(invoiceId, amount)
        default:
          throw new Error(`Unsupported payment gateway: ${paymentGateway}`)
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      throw new Error(`Failed to process payment: ${error.message}`)
    }
  }

  /**
   * Process payment through NOWPayments
   * @param {string} invoiceId - Invoice ID
   * @param {number} amount - Payment amount
   * @returns {object} - NOWPayments processing result
   */
  async processNOWPayments (invoiceId, amount) {
    try {
      // Get the NOWPayments gateway configuration
      const nowpaymentsGateway = await this.prisma.paymentGateway.findFirst({
        where: {
          name: 'NOWPayments',
          isActive: true
        }
      })

      if (!nowpaymentsGateway) {
        throw new Error('NOWPayments gateway not found or not active')
      }

      // Create NOWPayments service with the gateway configuration
      const nowpaymentsService = new NOWPaymentsService(nowpaymentsGateway)

      // Prepare payment data
      const paymentData = {
        price_amount: amount,
        price_currency: 'usd',
        ipn_callback_url: `${process.env.BACKEND_BASE_URL}/api/payments/nowpayments/ipn-callback`,
        order_id: invoiceId,
        order_description: `Payment for invoice ${invoiceId}`
      }

      // Create payment using NOWPayments service
      const payment = await nowpaymentsService.createPayment(paymentData)

      return {
        paymentId: payment.payment_id.toString(),
        paymentUrl: payment.payment_url
      }
    } catch (error) {
      console.error('Error processing NOWPayments:', error)
      throw new Error(`Failed to process NOWPayments: ${error.message}`)
    }
  }

  /**
   * Handle IPN callback from NOWPayments
   * @param {object} body - Callback body
   * @param {string} signature - Callback signature
   * @returns {object} - Processing result
   */
  async handleNOWPaymentsIPN (body, signature) {
    try {
      const { order_id, payment_status } = body

      if (!order_id) {
        throw new Error('Missing order_id in callback')
      }

      // Get the NOWPayments gateway configuration
      const nowpaymentsGateway = await this.prisma.paymentGateway.findFirst({
        where: {
          name: 'NOWPayments',
          isActive: true
        }
      })

      if (!nowpaymentsGateway) {
        throw new Error('NOWPayments gateway not found or not active')
      }

      // Create NOWPayments service with the gateway configuration
      const nowpaymentsService = new NOWPaymentsService(nowpaymentsGateway)

      // Verify the callback signature
      const isValid = nowpaymentsService.verifyIPNCallback(body, signature)

      if (!isValid) {
        throw new Error('Invalid IPN callback signature')
      }

      // Get invoice
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: order_id }
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Map NOWPayments status to our invoice status
      let newStatus = 'PENDING'

      switch (payment_status) {
        case 'finished':
          newStatus = 'COMPLETED'
          break
        case 'failed':
          newStatus = 'FAILED'
          break
        case 'pending':
        case 'confirming':
        case 'confirmed':
        case 'sending':
        case 'partially_paid':
          newStatus = 'PENDING'
          break
      }

      // Update invoice status
      const updatedInvoice = await this.prisma.invoice.update({
        where: { id: order_id },
        data: { status: newStatus }
      })

      // If payment is completed, update user balance
      if (newStatus === 'COMPLETED' && invoice.type === 'FUND_ADDITION') {
        await this.prisma.user.update({
          where: { id: invoice.userId },
          data: { balance: { increment: invoice.amount } }
        })
      }

      return { success: true, invoice: updatedInvoice }
    } catch (error) {
      console.error('Error handling NOWPayments IPN:', error)
      throw new Error(`Failed to handle NOWPayments IPN: ${error.message}`)
    }
  }

  /**
   * Get invoice payment status
   * @param {string} invoiceId - Invoice ID
   * @param {string} paymentGateway - Payment gateway name
   * @returns {object} - Payment status
   */
  async getPaymentStatus (invoiceId, paymentGateway) {
    try {
      switch (paymentGateway) {
        case 'NOWPayments':
          return await this.getNOWPaymentsStatus(invoiceId)
        default:
          throw new Error(`Unsupported payment gateway: ${paymentGateway}`)
      }
    } catch (error) {
      console.error('Error getting payment status:', error)
      throw new Error(`Failed to get payment status: ${error.message}`)
    }
  }

  /**
   * Get NOWPayments status for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {object} - NOWPayments status
   */
  async getNOWPaymentsStatus (invoiceId) {
    try {
      // Get the NOWPayments gateway configuration
      const nowpaymentsGateway = await this.prisma.paymentGateway.findFirst({
        where: {
          name: 'NOWPayments',
          isActive: true
        }
      })

      if (!nowpaymentsGateway) {
        throw new Error('NOWPayments gateway not found or not active')
      }

      // Create NOWPayments service with the gateway configuration
      const nowpaymentsService = new NOWPaymentsService(nowpaymentsGateway)

      // Get payment status using NOWPayments service
      const status = await nowpaymentsService.getListOfPayments()

      // Find payment matching our invoice ID
      const payment = status.payments.find(p => p.order_id === invoiceId)

      if (!payment) {
        throw new Error('Payment not found for this invoice')
      }

      return payment
    } catch (error) {
      console.error('Error getting NOWPayments status:', error)
      throw new Error(`Failed to get NOWPayments status: ${error.message}`)
    }
  }
}

export default PaymentProcessingService
