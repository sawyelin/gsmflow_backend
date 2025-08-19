import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { createAccessToken } from '../services/tokenService.js';
import { sendVerificationEmail } from '../services/emailService.js';

export const register = async (req, res) => {
  try {
    const { email, password, firstName = '', lastName = '' } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Prepare user data with email verification fields
    const userData = { 
      email, 
      passwordHash, 
      firstName, 
      lastName, 
      balance: 0.0,
      isEmailVerified: process.env.EMAIL_VERIFY_REQUIRED !== 'true' // Auto-verify if email verification is not required
    };

    const user = await prisma.user.create({
      data: userData,
    });
    
    // If email verification is required, generate token and send email
    if (process.env.EMAIL_VERIFY_REQUIRED === 'true') {
      const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires
        }
      });
      
      // Import email service here to avoid circular dependencies
      const { sendVerificationEmail } = await import('../services/emailService.js');
      await sendVerificationEmail(email, verificationToken);
    }
    
    // If verification is required, don't issue a token yet
    if (process.env.EMAIL_VERIFY_REQUIRED === 'true') {
      return res.status(201).json({ message: 'Verification email sent. Please check your inbox and spam folder.' });
    }

    const token = createAccessToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), balance: user.balance, role: user.role } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Check if email verification is required
    if (process.env.EMAIL_VERIFY_REQUIRED === 'true' && !user.isEmailVerified) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    const token = createAccessToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), balance: user.balance, role: user.role } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        balance: true,
        role: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        twoFactorMethod: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        balance: user.balance,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const updateBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || isNaN(amount) || amount < -10000 || amount > 10000) return res.status(400).json({ error: 'Invalid amount' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.balance + amount < 0) return res.status(400).json({ error: 'Insufficient balance' });
    await prisma.user.update({ where: { id: req.user.id }, data: { balance: { increment: amount } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Valid name is required' });
    }
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        firstName: name.trim(),
        updatedAt: new Date()
      }
    });
    
    // Return updated user data
    res.json({ 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.firstName,
        balance: updatedUser.balance,
        isEmailVerified: updatedUser.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Check if user's email is verified
export const checkVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { isEmailVerified: true }
    });

    // If user doesn't exist, return false
    if (!user) {
      return res.json({ isEmailVerified: false });
    }

    // Return verification status
    res.json({ isEmailVerified: user.isEmailVerified });
  } catch (error) {
    console.error('Check verification error:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
};

// Verify email using token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: 'Verification token expired. Please resend verification email.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:8080';
    return res.redirect(`${frontendBase}/`);
  } catch (e) {
    console.error('Verify email error:', e);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isEmailVerified) {
      return res.json({ message: 'Email already verified. You can log in.' });
    }

    const verificationToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    await sendVerificationEmail(email, verificationToken);
    res.json({ message: 'Verification email sent' });
  } catch (e) {
    console.error('Resend verification error:', e);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};
