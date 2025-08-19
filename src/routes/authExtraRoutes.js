import { Router } from 'express';
import { verifyEmail, forgotPassword, resetPassword, resendVerification } from '../controllers/authExtraController.js';

const router = Router();

// Email verification routes
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
