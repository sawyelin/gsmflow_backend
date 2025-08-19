import { Router } from 'express';
import { register, login, me, updateBalance, updateProfile, checkVerification, verifyEmail, resendVerification } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import { changePassword } from '../controllers/authExtraController.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/check-verification', checkVerification);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected routes
router.get('/me', authRequired, me);
router.post('/update-balance', authRequired, updateBalance);
router.post('/change-password', authRequired, changePassword);
router.put('/update-profile', authRequired, updateProfile);

export default router;
