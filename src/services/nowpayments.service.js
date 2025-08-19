import axios from 'axios';
import EncryptionService from './encryption.service.js';
import { config } from '../config/env.js';

class NOWPaymentsService {
  constructor(paymentGateway) {
    this.encryptionService = new EncryptionService();
    
    // If paymentGateway is provided, use its decrypted keys
    if (paymentGateway) {
      this.apiKey = paymentGateway.apiKey ? this.encryptionService.decrypt(paymentGateway.apiKey) : config.nowpayments.apiKey;
      this.ipnSecretKey = paymentGateway.secretKey ? this.encryptionService.decrypt(paymentGateway.secretKey) : config.nowpayments.ipnSecret;
    } else {
      // Fallback to environment variables
      this.apiKey = config.nowpayments.apiKey;
      this.ipnSecretKey = config.nowpayments.ipnSecret;
    }
    
    this.baseUrl = config.nowpayments.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey
      }
    });
  }

  // Check API status
  async getApiStatus() {
    try {
      const response = await this.client.get('/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get API status: ${error.message}`);
    }
  }

  // Get available currencies
  async getAvailableCurrencies() {
    try {
      const response = await this.client.get('/currencies');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get available currencies: ${error.message}`);
    }
  }

  // Get minimum payment amount
  async getMinimumPaymentAmount(currencyFrom, currencyTo) {
    try {
      const response = await this.client.get(`/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get minimum payment amount: ${error.message}`);
    }
  }

  // Get estimated price
  async getEstimatedPrice(amount, currencyFrom, currencyTo) {
    try {
      const response = await this.client.get(`/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get estimated price: ${error.message}`);
    }
  }

  // Create invoice (used for redirect URL)
  async createInvoice(data) {
    try {
      // If pay_currency is 'any', remove it from the data to let NOWPayments handle currency selection
      if (data.pay_currency === 'any') {
        delete data.pay_currency;
      }
      
      const response = await this.client.post('/invoice', data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  // Create payment (used for redirect URL)
  async createPayment(data) {
    try {
      // If pay_currency is 'any', remove it from the data to let NOWPayments handle currency selection
      if (data.pay_currency === 'any') {
        delete data.pay_currency;
      }
      
      const response = await this.client.post('/payment', data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  // Get payment status
  async getPaymentStatus(paymentId) {
    try {
      const response = await this.client.get(`/payment/${paymentId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  // Get list of payments
  async getListOfPayments(limit = 10, offset = 0) {
    try {
      const response = await this.client.get(`/payments?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get list of payments: ${error.message}`);
    }
  }


  // Get available payment gateways
  async getPaymentGateways() {
    try {
      // NOWPayments doesn't have a specific endpoint for payment gateways
      // Instead, we'll return the available currencies as payment options
      const currencies = await this.getAvailableCurrencies();
      return currencies.currencies.map(currency => ({
        id: currency,
        name: currency.toUpperCase(),
        description: `Accept payments in ${currency.toUpperCase()}`
      }));
    } catch (error) {
      throw new Error(`Failed to get payment gateways: ${error.message}`);
    }
  }

  // Verify IPN callback signature
  verifyIPNCallback(body, signature) {
    if (!this.ipnSecretKey) {
      throw new Error('IPN secret key not configured');
    }

    try {
      // Sort the body parameters by keys and convert to string
      const sortedBody = JSON.stringify(body, Object.keys(body).sort());
      
      // Create HMAC signature using sha512
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha512', this.ipnSecretKey);
      hmac.update(sortedBody);
      const calculatedSignature = hmac.digest('hex');
      
      // Compare signatures
      return calculatedSignature === signature;
    } catch (error) {
      throw new Error(`Failed to verify IPN callback: ${error.message}`);
    }
  }
}

export default NOWPaymentsService;
