import NOWPaymentsService from '../services/nowpayments.service.js';

const nowpaymentsService = new NOWPaymentsService();

// Get NOWPayments API status
export const getNOWPaymentsApiStatus = async (req, res) => {
  try {
    const status = await nowpaymentsService.getApiStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking NOWPayments API status:', error);
    res.status(500).json({ error: 'Failed to check NOWPayments API status' });
  }
};

// Get available currencies
export const getAvailableCurrencies = async (req, res) => {
  try {
    const currencies = await nowpaymentsService.getAvailableCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching available currencies:', error);
    res.status(500).json({ error: 'Failed to fetch available currencies' });
  }
};

// Get minimum payment amount
export const getMinimumPaymentAmount = async (req, res) => {
  try {
    const { currencyFrom, currencyTo } = req.query;
    if (!currencyFrom || !currencyTo) {
      return res.status(400).json({ error: 'currencyFrom and currencyTo are required' });
    }
    
    const minAmount = await nowpaymentsService.getMinimumPaymentAmount(currencyFrom, currencyTo);
    res.json(minAmount);
  } catch (error) {
    console.error('Error fetching minimum payment amount:', error);
    res.status(500).json({ error: 'Failed to fetch minimum payment amount' });
  }
};

// Get estimated price
export const getEstimatedPrice = async (req, res) => {
  try {
    const { amount, currencyFrom, currencyTo } = req.query;
    if (!amount || !currencyFrom || !currencyTo) {
      return res.status(400).json({ error: 'amount, currencyFrom and currencyTo are required' });
    }
    
    const estimatedPrice = await nowpaymentsService.getEstimatedPrice(amount, currencyFrom, currencyTo);
    res.json(estimatedPrice);
  } catch (error) {
    console.error('Error fetching estimated price:', error);
    res.status(500).json({ error: 'Failed to fetch estimated price' });
  }
};

// Create payment
export const createNOWPayment = async (req, res) => {
  try {
    const paymentData = req.body;
    const payment = await nowpaymentsService.createPayment(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating NOWPayment:', error);
    res.status(500).json({ error: 'Failed to create NOWPayment' });
  }
};

// Get payment status
export const getNOWPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }
    
    const status = await nowpaymentsService.getPaymentStatus(paymentId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching NOWPayment status:', error);
    res.status(500).json({ error: 'Failed to fetch NOWPayment status' });
  }
};

// Get list of payments
export const getListOfNOWPayments = async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const payments = await nowpaymentsService.getListOfPayments(
      limit ? parseInt(limit) : 10,
      offset ? parseInt(offset) : 0
    );
    res.json(payments);
  } catch (error) {
    console.error('Error fetching list of NOWPayments:', error);
    res.status(500).json({ error: 'Failed to fetch list of NOWPayments' });
  }
};

// Handle IPN callback
export const handleIPNCallback = async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    const body = req.body;
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature header' });
    }
    
    // Verify the callback signature
    const isValid = nowpaymentsService.verifyIPNCallback(body, signature);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Process the payment update
    // TODO: Implement payment status update logic
    console.log('IPN Callback received:', body);
    
    // Send success response
    res.json({ message: 'IPN callback processed successfully' });
  } catch (error) {
    console.error('Error processing IPN callback:', error);
    res.status(500).json({ error: 'Failed to process IPN callback' });
  }
};
