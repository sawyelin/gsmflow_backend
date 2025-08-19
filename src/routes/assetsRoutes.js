import { Router } from 'express';
import { 
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset
} from '../controllers/assetsController.js';

import { authRequired } from '../middleware/auth.js';

const router = Router();

// Admin authorization middleware
const adminRequired = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

// Apply authentication middleware to all routes
router.use(authRequired);

// Apply admin authorization middleware to all routes
router.use(adminRequired);

// Assets routes
router.get('/assets', getAssets);
router.post('/assets', createAsset);
router.put('/assets/:id', updateAsset);
router.delete('/assets/:id', deleteAsset);

export default router;
