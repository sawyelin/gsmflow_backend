import { Router } from 'express'
import {
  getApiConfigs,
  getApiConfigById,
  createApiConfig,
  updateApiConfig,
  deleteApiConfig,
  setDefaultApiConfig,
  testApiConnection,
  syncServices,
  getServicesByApiConfig,
  getServicesByType,
  getServicesByGroup,
  getActiveServices,
  getServiceStats,
  getDashboardStats,
  listSyncLogs,
  getSyncLog,
  // users
  listUsers,
  updateUser,
  deleteUser,
  setUserRole,
  adjustUserBalance,
  toggleUserActive,
  // orders
  getAllOrders,
  updateOrderStatus
} from '../controllers/dhruAdminController.js'

import {
  getSiteSettings,
  updateSiteSettings
} from '../controllers/siteSettingsController.js'

import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset
} from '../controllers/assetsController.js'

import { authRequired } from '../middleware/auth.js'
import { me as adminMe } from '../controllers/authController.js'

const router = Router()

// Apply authentication middleware to all routes
// Note: Some routes may need admin-specific middleware in the future
router.use(authRequired)

// Admin me endpoint
router.get('/me', adminMe)

// DHRU API Configuration routes
router.get('/api-configs', getApiConfigs)
router.get('/api-configs/:id', getApiConfigById)
router.post('/api-configs', createApiConfig)
router.put('/api-configs/:id', updateApiConfig)
router.delete('/api-configs/:id', deleteApiConfig)
router.post('/api-configs/:id/default', setDefaultApiConfig)

// Test DHRU API connection
router.post('/test-connection', testApiConnection)

// Service synchronization routes (admin only)
router.post('/api-configs/:apiConfigId/sync', syncServices)

// Service retrieval routes
router.get('/api-configs/:apiConfigId/services', getServicesByApiConfig)
router.get('/api-configs/:apiConfigId/services/type/:type', getServicesByType)
router.get('/api-configs/:apiConfigId/services/group/:groupId', getServicesByGroup)
router.get('/api-configs/:apiConfigId/services/active', getActiveServices)
router.get('/api-configs/:apiConfigId/service-stats', getServiceStats)

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats)

// Sync logs
router.get('/sync-logs', listSyncLogs)
router.get('/sync-logs/:id', getSyncLog)

// Users management (admin only)
router.get('/users', listUsers)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)
router.post('/users/:id/role', setUserRole)
router.post('/users/:id/balance', adjustUserBalance)
router.post('/users/:id/toggle-active', toggleUserActive)

// Orders routes (admin only)
router.get('/orders', getAllOrders)
router.put('/orders/:id/status', updateOrderStatus)

// Site settings routes (admin only)
router.get('/site-settings', getSiteSettings)
router.put('/site-settings', updateSiteSettings)

// Asset management routes (admin only)
router.get('/assets', getAssets)
router.post('/assets', createAsset)
router.put('/assets/:id', updateAsset)
router.delete('/assets/:id', deleteAsset)

export default router
