import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Create a transporter object using the default SMTP transport
const createTransporter = () => {
  // Use SMTP if EMAIL_HOST is configured, otherwise use console transport
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('Using SMTP transport for email sending');
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // In development or when SMTP not configured, use console transport (log emails to console)
  console.log('Using console transport for email sending (DEV MODE)');
  return {
    sendMail: async (mailOptions) => {
      console.log('EMAIL SEND (DEV MODE):', mailOptions);
      console.log('\n=== EMAIL VERIFICATION INSTRUCTIONS ===');
      console.log('Since SMTP is not configured, please manually verify the user by:');
      console.log('1. Copy this verification URL:', mailOptions.text.match(/http[s]?:\/\/[^\s]+/)[0]);
      console.log('2. Open it in your browser to verify the email');
      console.log('=========================================\n');
      return { messageId: 'dev-mode-message-id' };
    }
  };
};

const transporter = createTransporter();

// Send verification email
export const sendVerificationEmail = async (email, token) => {
  const backendBase = process.env.BACKEND_BASE_URL || 'http://localhost:3000';
  const verificationUrl = `${backendBase}/api/auth/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@gsmflow.com',
    to: email,
    subject: 'Verify your email address',
    text: `Please click on the following link to verify your email address: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #0066cc; font-size: 24px; margin: 0;">GSMFlow</h1>
          <p style="color: #64748b; font-size: 16px; margin: 10px 0 0;">Unlocking Mobile Solutions</p>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-top: 20px;">
          <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 20px;">Email Verification</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Thank you for registering with GSMFlow. Please click the button below to verify your email address:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Verify Email
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
            If you're having trouble clicking the button, copy and paste the following link into your browser:
          </p>
          <p style="color: #0066cc; font-size: 14px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 30px;">
            If you did not create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} GSMFlow. All rights reserved.</p>
        </div>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

// Send password reset email
export const sendPasswordResetEmail = async (email, token) => {
  const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  
  // In production, send to the actual user's email
  // In development, send to TEST_EMAIL if it exists, otherwise to the user's email
  const recipientEmail = process.env.NODE_ENV === 'production' 
    ? email 
    : (process.env.TEST_EMAIL || email);
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@gsmflow.com',
    to: recipientEmail,
    subject: 'Password Reset Request',
    text: `Please click on the following link to reset your password: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <h1 style="color: #2563eb; margin: 0; font-size: 1.5rem;">GSMFlow</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 1.5rem; border-radius: 6px; margin-bottom: 1.5rem;">
          <h2 style="color: #1e293b; margin-top: 0; font-size: 1.25rem;">Reset Your Password</h2>
          <p style="color: #475569; margin: 1rem 0;">You've requested to reset your password. Click the button below to set a new password:</p>
          
          <div style="margin: 1.5rem 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 0.75rem 1.5rem; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background-color 0.2s;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 0.875rem; margin: 0;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 0.75rem; margin: 0.5rem 0;">
            This link will expire in 1 hour.
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 30px;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} GSMFlow. All rights reserved.</p>
        </div>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};
