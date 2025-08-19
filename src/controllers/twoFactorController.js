import { prisma } from '../lib/prisma.js';

export const getTwoFactorStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: {
        isTwoFactorEnabled: true,
        twoFactorMethod: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod
    });
  } catch (error) {
    console.error('Get two-factor status error:', error);
    res.status(500).json({ error: 'Failed to get two-factor status' });
  }
};

export const enableTwoFactor = async (req, res) => {
  try {
    const { method } = req.body;
    
    // Validate method
    if (!method || (method !== 'email' && method !== 'authenticator')) {
      return res.status(400).json({ error: 'Invalid two-factor method. Must be "email" or "authenticator".' });
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isTwoFactorEnabled: true,
        twoFactorMethod: method,
        updatedAt: new Date()
      },
      select: {
        isTwoFactorEnabled: true,
        twoFactorMethod: true
      }
    });
    
    res.json({
      isTwoFactorEnabled: updatedUser.isTwoFactorEnabled,
      twoFactorMethod: updatedUser.twoFactorMethod
    });
  } catch (error) {
    console.error('Enable two-factor error:', error);
    res.status(500).json({ error: 'Failed to enable two-factor authentication' });
  }
};

export const disableTwoFactor = async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isTwoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        updatedAt: new Date()
      },
      select: {
        isTwoFactorEnabled: true,
        twoFactorMethod: true
      }
    });
    
    res.json({
      isTwoFactorEnabled: updatedUser.isTwoFactorEnabled,
      twoFactorMethod: updatedUser.twoFactorMethod
    });
  } catch (error) {
    console.error('Disable two-factor error:', error);
    res.status(500).json({ error: 'Failed to disable two-factor authentication' });
  }
};

export const generateTwoFactorSecret = async (req, res) => {
  try {
    // For authenticator app method, we would generate a secret here
    // In a real implementation, you would use a library like speakeasy or otplib
    const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Save secret to user
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorSecret: secret,
        updatedAt: new Date()
      }
    });
    
    // In a real implementation, you would also generate a QR code URL
    // For now, we'll just return the secret
    res.json({ secret });
  } catch (error) {
    console.error('Generate two-factor secret error:', error);
    res.status(500).json({ error: 'Failed to generate two-factor secret' });
  }
};
