import { PrismaClient } from '@prisma/client';
import NOWPaymentsService from '../services/nowpayments.service.js';
import EncryptionService from '../services/encryption.service.js';

const prisma = new PrismaClient();
const nowpaymentsService = new NOWPaymentsService();
const encryptionService = new EncryptionService();

// Get all payment gateways
export const getPaymentGateways = async (req, res) => {
  try {
    const gateways = await prisma.paymentGateway.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(gateways);
  } catch (error) {
    console.error('Error fetching payment gateways:', error);
    res.status(500).json({ error: 'Failed to fetch payment gateways' });
  }
};

// Get a specific payment gateway by ID
export const getPaymentGatewayById = async (req, res) => {
  try {
    const { id } = req.params;
    const gateway = await prisma.paymentGateway.findUnique({
      where: { id }
    });
    
    if (!gateway) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }
    
    res.json(gateway);
  } catch (error) {
    console.error('Error fetching payment gateway:', error);
    res.status(500).json({ error: 'Failed to fetch payment gateway' });
  }
};

// Create a new payment gateway
export const createPaymentGateway = async (req, res) => {
  try {
    const { name, apiKey, secretKey, isActive, isDefault } = req.body;
    
    // Encrypt sensitive keys before storing
    // Check if keys are already encrypted to avoid double encryption
    const encryptedApiKey = apiKey ? encryptionService.encrypt(apiKey) : null;
    const encryptedSecretKey = secretKey ? encryptionService.encrypt(secretKey) : null;
    
    // If this gateway is set as default, unset the current default gateway
    if (isDefault) {
      await prisma.paymentGateway.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const gateway = await prisma.paymentGateway.create({
      data: {
        name,
        apiKey: encryptedApiKey,
        secretKey: encryptedSecretKey,
        isActive: isActive !== undefined ? isActive : true,
        isDefault: isDefault !== undefined ? isDefault : false
      }
    });
    
    // Return decrypted keys in response for immediate use
    if (gateway.apiKey) {
      gateway.apiKey = apiKey; // Return original for response
    }
    if (gateway.secretKey) {
      gateway.secretKey = secretKey; // Return original for response
    }
    
    res.status(201).json(gateway);
  } catch (error) {
    console.error('Error creating payment gateway:', error);
    res.status(500).json({ error: 'Failed to create payment gateway' });
  }
};

// Update a payment gateway
export const updatePaymentGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, apiKey, secretKey, isActive, isDefault } = req.body;
    
    // Encrypt sensitive keys if provided
    const encryptedApiKey = apiKey !== undefined ? (apiKey ? encryptionService.encrypt(apiKey) : null) : undefined;
    const encryptedSecretKey = secretKey !== undefined ? (secretKey ? encryptionService.encrypt(secretKey) : null) : undefined;
    
    // If this gateway is set as default, unset the current default gateway
    if (isDefault) {
      await prisma.paymentGateway.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const gateway = await prisma.paymentGateway.update({
      where: { id },
      data: {
        name,
        apiKey: encryptedApiKey,
        secretKey: encryptedSecretKey,
        isActive,
        isDefault
      }
    });
    
    // Return decrypted keys in response for immediate use
    if (gateway.apiKey && encryptedApiKey !== undefined) {
      gateway.apiKey = apiKey; // Return original for response
    }
    if (gateway.secretKey && encryptedSecretKey !== undefined) {
      gateway.secretKey = secretKey; // Return original for response
    }
    
    res.json(gateway);
  } catch (error) {
    console.error('Error updating payment gateway:', error);
    res.status(500).json({ error: 'Failed to update payment gateway' });
  }
};

// Delete a payment gateway
export const deletePaymentGateway = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if this is the default gateway
    const gateway = await prisma.paymentGateway.findUnique({
      where: { id }
    });
    
    if (gateway.isDefault) {
      return res.status(400).json({ error: 'Cannot delete the default payment gateway' });
    }
    
    await prisma.paymentGateway.delete({
      where: { id }
    });
    
    res.json({ message: 'Payment gateway deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment gateway:', error);
    res.status(500).json({ error: 'Failed to delete payment gateway' });
  }
};

// Get the default payment gateway
export const getDefaultPaymentGateway = async (req, res) => {
  try {
    const gateway = await prisma.paymentGateway.findFirst({
      where: { isDefault: true }
    });
    
    if (!gateway) {
      return res.status(404).json({ error: 'No default payment gateway found' });
    }
    
    res.json(gateway);
  } catch (error) {
    console.error('Error fetching default payment gateway:', error);
    res.status(500).json({ error: 'Failed to fetch default payment gateway' });
  }
};

// NOWPayments specific methods
export const getNOWPaymentsStatus = async (req, res) => {
  try {
    const status = await nowpaymentsService.getApiStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking NOWPayments API status:', error);
    res.status(500).json({ error: 'Failed to check NOWPayments API status' });
  }
};

export const getNOWPaymentsCurrencies = async (req, res) => {
  try {
    const currencies = await nowpaymentsService.getAvailableCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching NOWPayments currencies:', error);
    res.status(500).json({ error: 'Failed to fetch NOWPayments currencies' });
  }
};

// Get available payment gateways from NOWPayments
export const getAvailableNOWPaymentGateways = async (req, res) => {
  try {
    // Get the NOWPayments gateway configuration from database
    const nowpaymentsGateway = await prisma.paymentGateway.findFirst({
      where: { 
        name: 'NOWPayments',
        isActive: true 
      }
    });
    
    // Create NOWPayments service with the gateway configuration
    const nowpaymentsServiceInstance = new NOWPaymentsService(nowpaymentsGateway);
    
    const gateways = await nowpaymentsServiceInstance.getPaymentGateways();
    res.json(gateways);
  } catch (error) {
    console.error('Error fetching NOWPayments gateways:', error);
    res.status(500).json({ error: 'Failed to fetch NOWPayments gateways' });
  }
};

export const createNOWPayment = async (req, res) => {
  try {
    // Get the NOWPayments gateway configuration
    const nowpaymentsGateway = await prisma.paymentGateway.findFirst({
      where: { 
        name: 'NOWPayments',
        isActive: true 
      }
    });
    
    if (!nowpaymentsGateway) {
      return res.status(404).json({ error: 'NOWPayments gateway not found or not active' });
    }
    
    // Create NOWPayments service with the gateway configuration
    const nowpaymentsServiceInstance = new NOWPaymentsService(nowpaymentsGateway);
    
    // Prepare payment data
    const paymentData = {
      price_amount: req.body.amount,
      price_currency: req.body.currency || 'usd',
      pay_currency: req.body.payCurrency,
      ipn_callback_url: `${process.env.BACKEND_BASE_URL}/api/nowpayments/ipn-callback`,
      success_url: req.body.successUrl,
      cancel_url: req.body.cancelUrl,
      order_id: req.body.orderId,
      order_description: req.body.description
    };
    
    // Create payment using NOWPayments service
    const payment = await nowpaymentsServiceInstance.createPayment(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating NOWPayment:', error);
    res.status(500).json({ error: 'Failed to create NOWPayment' });
  }
};

export const getNOWPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }
    
    // Get the NOWPayments gateway configuration
    const nowpaymentsGateway = await prisma.paymentGateway.findFirst({
      where: { 
        name: 'NOWPayments',
        isActive: true 
      }
    });
    
    // Create NOWPayments service with the gateway configuration
    const nowpaymentsServiceInstance = new NOWPaymentsService(nowpaymentsGateway);
    
    const status = await nowpaymentsServiceInstance.getPaymentStatus(paymentId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching NOWPayment status:', error);
    res.status(500).json({ error: 'Failed to fetch NOWPayment status' });
  }
};
