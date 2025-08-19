import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config/env.js';
import { securityHeaders, rateLimiter } from './middleware/security.js';
import { apiProtection } from './middleware/apiProtection.js';
import { validateInputs } from './middleware/inputValidation.js';
import authRoutes from './routes/authRoutes.js';
import authExtraRoutes from './routes/authExtraRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import fundRoutes from './routes/fundRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import dhruRoutes from './routes/dhruRoutes.js';
import dhruAdminRoutes from './routes/dhruAdminRoutes.js';
import depositRoutes from './routes/depositRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import paymentGatewayRoutes from './routes/paymentGatewayRoutes.js';
import nowpaymentsRoutes from './routes/nowpayments.routes.js';

import twoFactorRoutes from './routes/twoFactorRoutes.js';
import siteSettingsRoutes from './routes/siteSettingsRoutes.js';
import assetsRoutes from './routes/assetsRoutes.js';

export const createApp = () => {
  const app = express();

  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...config.corsOrigins],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));
  app.use(securityHeaders);
  app.use(rateLimiter);

  // Core middleware
  app.use(cors({ 
    origin: config.corsOrigins, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'X-Content-Type-Options', 'X-Frame-Options'],
    maxAge: 86400 // 24 hours
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Input validation
  app.use(validateInputs);

  // Public routes (no auth required)
  app.get('/api/public/site-settings', async (req, res) => {
    try {
      const { getPublicSiteSettings } = await import('./controllers/siteSettingsController.js');
      await getPublicSiteSettings(req, res);
    } catch (error) {
      console.error('Error loading site settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Public page assets route
  app.get('/api/public/page-assets', async (req, res) => {
    try {
      const { getPublicPageAssets } = await import('./controllers/siteSettingsController.js');
      await getPublicPageAssets(req, res);
    } catch (error) {
      console.error('Error loading page assets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Public assets route
  app.get('/api/public/assets', async (req, res) => {
    try {
      const { getPublicAssets } = await import('./controllers/assetsController.js');
      await getPublicAssets(req, res);
    } catch (error) {
      console.error('Error loading assets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Register all routes first
  app.use('/api/auth', authRoutes);
  app.use('/api/auth', authExtraRoutes);
  app.use('/api/dhru', dhruRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/two-factor', twoFactorRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/funds', fundRoutes);
  app.use('/api/site-settings', siteSettingsRoutes);
  app.use('/api/assets', assetsRoutes);
  app.use('/api/dhru-admin', dhruAdminRoutes);
  app.use('/api/deposits', depositRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/payment-gateways', paymentGatewayRoutes);
  app.use('/api/nowpayments', nowpaymentsRoutes);

  // API Protection - apply to all API routes EXCEPT IPN callbacks
  app.use('/api/', apiProtection);

  // Re-register IPN callback endpoints to exempt them from API protection
  app.post('/api/deposits/ipn-callback', (req, res, next) => {
    // Import and call the controller function directly
    import('./controllers/depositController.js').then(controller => {
      controller.nowpaymentsIPNCallback(req, res);
    }).catch(err => {
      console.error('Error importing deposit controller:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  });
  
  app.post('/api/payments/nowpayments/ipn-callback', (req, res, next) => {
    // Import and call the controller function directly
    import('./controllers/payments.controller.js').then(controller => {
      controller.nowpaymentsIPNCallback(req, res);
    }).catch(err => {
      console.error('Error importing payments controller:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  });
  
  app.post('/api/nowpayments/ipn-callback', (req, res, next) => {
    // Import and call the controller function directly
    import('./controllers/nowpayments.controller.js').then(controller => {
      controller.handleIPNCallback(req, res);
    }).catch(err => {
      console.error('Error importing nowpayments controller:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  });

  // Health
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // 404
  app.use('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  return app;
};


