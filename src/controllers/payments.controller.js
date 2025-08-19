import PaymentProcessingService from '../services/paymentProcessing.service.js';

const paymentService = new PaymentProcessingService();

/**
 * Create an invoice with payment gateway integration
 * @route POST /api/payments/invoice
 * @access Private
 */
export const createInvoiceWithPayment = async (req, res) => {
  try {
    const { amount, type, description, paymentGateway } = req.body;
    
    // Validate input
    if (!amount || !type || !paymentGateway) {
      return res.status(400).json({ error: 'Amount, type, and paymentGateway are required' });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Create invoice with payment
    const result = await paymentService.createInvoiceWithPayment(
      req.user.id,
      amount,
      type,
      description || `Payment via ${paymentGateway}`,
      paymentGateway
    );
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in createInvoiceWithPayment controller:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice with payment' });
  }
};

/**
 * Get payment status for an invoice
 * @route GET /api/payments/status/:invoiceId
 * @access Private
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentGateway } = req.query;
    
    if (!invoiceId || !paymentGateway) {
      return res.status(400).json({ error: 'invoiceId and paymentGateway are required' });
    }
    
    // Check if user owns this invoice
    const invoice = await paymentService.prisma.invoice.findFirst({
      where: { 
        id: invoiceId,
        userId: req.user.id
      }
    });
    
    if (!invoice) {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }
    
    // Get payment status
    const status = await paymentService.getPaymentStatus(invoiceId, paymentGateway);
    
    res.json({ status });
  } catch (error) {
    console.error('Error in getPaymentStatus controller:', error);
    res.status(500).json({ error: error.message || 'Failed to get payment status' });
  }
};

/**
 * NOWPayments IPN callback handler
 * @route POST /api/payments/nowpayments/ipn-callback
 * @access Public
 */
export const nowpaymentsIPNCallback = async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    
    if (!req.body || !signature) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    // Handle IPN callback
    const result = await paymentService.handleNOWPaymentsIPN(req.body, signature);
    
    res.json(result);
  } catch (error) {
    console.error('Error in nowpaymentsIPNCallback controller:', error);
    res.status(500).json({ error: error.message || 'Failed to process IPN callback' });
  }
};
