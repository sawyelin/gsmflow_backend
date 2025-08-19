import { prisma } from '../lib/prisma.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js'
import bcrypt from 'bcryptjs'

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update user password
    await prisma.user.update({
      where: {
        id: req.user.id
      },
      data: {
        passwordHash: newPasswordHash
      }
    })

    res.json({ message: 'Password changed successfully' })
  } catch (e) {
    console.error('Change password error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' })
    }

    const user = await prisma.user.findUnique({
      where: {
        emailVerificationToken: token
      }
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' })
    }

    // Check if token has expired
    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' })
    }

    // Update user as verified
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    })

    res.json({ message: 'Email verified successfully' })
  } catch (e) {
    console.error('Email verification error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified' })
    }

    // Generate new verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user with new token
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      }
    })

    // Send verification email
    await sendVerificationEmail(email, verificationToken)

    res.json({ message: 'Verification email sent successfully' })
  } catch (e) {
    console.error('Resend verification error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!user) {
      // We don't reveal if the email exists or not for security reasons
      return res.json({ message: 'If your email exists in our system, you will receive a password reset link' })
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      }
    })

    // Send reset email
    await sendPasswordResetEmail(email, resetToken)

    res.json({ message: 'If your email exists in our system, you will receive a password reset link' })
  } catch (e) {
    console.error('Forgot password error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' })
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const user = await prisma.user.findUnique({
      where: {
        resetPasswordToken: token
      }
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid reset token' })
    }

    // Check if token has expired
    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10)

    // Update user with new password and clear reset token
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    })

    res.json({ message: 'Password reset successfully' })
  } catch (e) {
    console.error('Reset password error:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}
