import { prisma } from '../lib/prisma.js';
import DepositService from '../services/deposit.service.js';
import NOWPaymentsService from '../services/nowpayments.service.js';

export const getBalance = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { balance: true } });
  res.json({ balance: user?.balance ?? 0 });
};

export const getTotalDeposits = async (req, res) => {
  try {
    const depositService = new DepositService();
    const totalDeposits = await depositService.getUserTotalDeposits(req.user.id);
    res.json({ totalDeposits });
  } catch (error) {
    console.error('Error fetching total deposits:', error);
    res.status(500).json({ error: 'Failed to fetch total deposits' });
  }
};

export const addFunds = async (req, res) => {
  try {
    const { amount, paymentMethod = 'manual', payCurrency = 'any' } = req.body;
    if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    
    // If payment method is NOWPayments, create a deposit instead of directly adding funds
    if (paymentMethod === 'NOWPayments') {
      // Create deposit service
      const service = new DepositService();
      
      // Create deposit with NOWPayments and selected cryptocurrency
      const depositResult = await service.createDeposit(req.user.id, amount, 'NOWPayments', 'usd', `Deposit via NOWPayments`, payCurrency);
      
      // Return the payment URL for redirect
      return res.json({ success: true, paymentUrl: depositResult.paymentUrl });
    }
    
    // For other payment methods, directly add funds
    const invoice = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.user.id }, data: { balance: { increment: amount } } });
      return tx.invoice.create({
        data: { userId: req.user.id, amount, type: 'FUND_ADDITION', status: 'COMPLETED', description: `Funds added via ${paymentMethod}` }
      });
    });
    const balance = (await prisma.user.findUnique({ where: { id: req.user.id }, select: { balance: true } }))?.balance || 0;
    res.json({ success: true, newBalance: balance, invoice });
  } catch (e) {
    console.error('Error in addFunds controller:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listInvoices = async (req, res) => {
  try {
    // Fetch invoices
    const invoices = await prisma.invoice.findMany({ 
      where: { userId: req.user.id }, 
      orderBy: { createdAt: 'desc' } 
    });
    
    // Fetch deposits
    const deposits = await prisma.deposit.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Combine and format both invoices and deposits
    const allTransactions = [
      ...invoices.map(inv => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        description: inv.description || `Invoice ${inv.type}`,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        type: 'invoice'
      })),
      ...deposits.map(dep => ({
        id: dep.id,
        amount: dep.amount,
        status: dep.status.toUpperCase(),
        description: dep.description || `Deposit via ${dep.paymentGateway}`,
        createdAt: dep.createdAt,
        updatedAt: dep.updatedAt,
        type: 'deposit'
      }))
    ]
    
    // Sort by creation date
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(allTransactions);
  } catch (error) {
    console.error('Error fetching invoices and deposits:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
};

export const getNowPaymentsCurrencies = async (req, res) => {
  try {
    const nowPaymentsService = new NOWPaymentsService();
    const data = await nowPaymentsService.getAvailableCurrencies();
    res.json(data.currencies);
  } catch (error) {
    console.error('Error fetching NOWPayments currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
};

export const payInvoice = async (req, res) => {
  try {
    const inv = await prisma.invoice.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (inv.status === 'COMPLETED') return res.json({ success: true });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.user.id }, data: { balance: { decrement: inv.amount } } });
      await tx.invoice.update({ where: { id: inv.id }, data: { status: 'COMPLETED' } });
    });
    const balance = (await prisma.user.findUnique({ where: { id: req.user.id }, select: { balance: true } }))?.balance || 0;
    res.json({ success: true, newBalance: balance });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


