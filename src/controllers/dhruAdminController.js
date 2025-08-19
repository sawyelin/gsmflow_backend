import { dhruAdminService } from '../services/dhruAdminService.js'
import { prisma } from '../lib/prisma.js'
import { dhruService } from '../services/dhruService.js'

// Map DHRU status codes to our status
const mapDhruStatusToOrderStatus = (dhruOrderStatus) => {
  switch (dhruOrderStatus) {
    case '4': // Completed
      return 'COMPLETED'
    case '0': // Pending
    case '1': // In Progress
    case '2': // Waiting for Payment
      return 'PROCESSING'
    case '3': // Cancelled
    case '6': // Refunded
      return 'CANCELLED'
    case '5': // Partially Completed
    case '7': // Failed
      return 'FAILED'
    default:
      return 'PROCESSING'
  }
}

// Aggregate service stats (counts by type and by group) for a given API config
export const getServiceStats = async (req, res) => {
  try {
    const { apiConfigId } = req.params
    const config = await prisma.dhruApiConfig.findUnique({ where: { id: apiConfigId } })
    if (!config) return res.status(404).json({ error: 'API configuration not found' })

    // Build rows using existing helper
    const all = dhruAdminService.buildServiceRowsFromConfig(config)

    const countsByType = all.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1
      return acc
    }, {})

    const countsByGroup = all.reduce((acc, s) => {
      const g = s.groupName || 'Unknown'
      acc[g] = (acc[g] || 0) + 1
      return acc
    }, {})

    const activeCount = all.filter(s => s.isActive).length

    res.json({
      total: all.length,
      active: activeCount,
      countsByType,
      countsByGroup,
      syncedAt: config.servicesSyncedAt || null
    })
  } catch (error) {
    console.error('Error getting service stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// List sync logs with pagination
export const listSyncLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10)
    const pageSize = Math.min(parseInt(req.query.pageSize || '20', 10), 100)
    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.serviceSyncLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { apiConfig: { select: { id: true, name: true } } }
      }),
      prisma.serviceSyncLog.count()
    ])

    res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (e) {
    console.error('Error listing sync logs:', e)
    res.status(500).json({ error: 'Failed to list sync logs' })
  }
}

// Get single sync log by id
export const getSyncLog = async (req, res) => {
  try {
    const { id } = req.params
    const log = await prisma.serviceSyncLog.findUnique({
      where: { id },
      include: { apiConfig: { select: { id: true, name: true, apiUrl: true, username: true } } }
    })
    if (!log) return res.status(404).json({ error: 'Not found' })
    res.json(log)
  } catch (e) {
    console.error('Error getting sync log:', e)
    res.status(500).json({ error: 'Failed to get sync log' })
  }
}

// Dashboard stats: services + basic users/orders counts
export const getDashboardStats = async (req, res) => {
  try {
    const { apiConfigId } = req.query
    let serviceStats = null
    if (apiConfigId) {
      const config = await prisma.dhruApiConfig.findUnique({ where: { id: String(apiConfigId) } })
      if (config) {
        const all = dhruAdminService.buildServiceRowsFromConfig(config)
        serviceStats = {
          total: all.length,
          active: all.filter(s => s.isActive).length,
          byType: all.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc }, {}),
          syncedAt: config.servicesSyncedAt || null
        }
      }
    } else {
      // Aggregate across all API configs
      const configs = await prisma.dhruApiConfig.findMany()
      if (configs?.length) {
        const allRows = configs.flatMap(cfg => dhruAdminService.buildServiceRowsFromConfig(cfg))
        const byType = allRows.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc }, {})
        // Use the latest syncedAt among configs as overall
        const syncedAt = configs
          .map(c => c.servicesSyncedAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || null
        serviceStats = {
          total: allRows.length,
          active: allRows.filter(s => s.isActive).length,
          byType,
          syncedAt
        }
      }
    }

    const [
      usersCount,
      adminsCount,
      ordersCount,
      usersBalanceAgg,
      salesAgg,
      depositsAgg,
      syncHistoryCount,
      pendingDepositsCount
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.order.count(),
      prisma.user.aggregate({ _sum: { balance: true } }),
      prisma.order.aggregate({ _sum: { price: true }, where: { status: 'COMPLETED' } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { type: 'FUND_ADDITION', status: 'COMPLETED' } }),
      prisma.serviceSyncLog.count(),
      prisma.deposit.count({ where: { status: { in: ['pending', 'pending_payment'] } } })
    ])

    const totalUsersBalance = usersBalanceAgg?._sum?.balance || 0
    const totalSalesAmount = salesAgg?._sum?.price || 0
    const totalDepositsAmount = depositsAgg?._sum?.amount || 0
    const totalRevenueAmount = totalSalesAmount // adjust if you track provider costs

    res.json({
      usersCount,
      adminsCount,
      ordersCount,
      serviceStats,
      totalUsersBalance,
      totalSalesAmount,
      totalDepositsAmount,
      totalRevenueAmount,
      syncHistoryCount,
      pendingDepositsCount
    })
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ===== Admin Users Management =====
export const listUsers = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' })
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        balance: true,
        createdAt: true,
        lastLogin: true
      }
    })
    res.json(users)
  } catch (e) {
    console.error('Error listing users:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' })
    const { id } = req.params
    const { firstName, lastName, email, role, isActive, isEmailVerified } = req.body
    const data = {}
    if (firstName !== undefined) data.firstName = firstName
    if (lastName !== undefined) data.lastName = lastName
    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = !!isActive
    if (isEmailVerified !== undefined) data.isEmailVerified = !!isEmailVerified
    const user = await prisma.user.update({ where: { id }, data })
    res.json(user)
  } catch (e) {
    console.error('Error updating user:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' })
    const { id } = req.params
    await prisma.user.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    console.error('Error deleting user:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const setUserRole = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' })
    const { id } = req.params
    const { role } = req.body // 'ADMIN' | 'USER'
    const user = await prisma.user.update({ where: { id }, data: { role } })
    res.json(user)
  } catch (e) {
    console.error('Error setting user role:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const adjustUserBalance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' })
    const { id } = req.params
    const { amount } = req.body // number (can be negative)
    if (typeof amount !== 'number' || isNaN(amount) || amount < -100000 || amount > 100000) {
      return res.status(400).json({ error: 'Invalid amount' })
    }
    const user = await prisma.user.update({
      where: { id },
      data: { balance: { increment: amount } }
    })
    res.json({ success: true, balance: user.balance })
  } catch (e) {
    console.error('Error adjusting balance:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const toggleUserActive = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' })
    const { id } = req.params
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: { set: undefined } }
    })
    // Prisma doesn't support toggle in one op; fetch current and flip
    const now = await prisma.user.findUnique({ where: { id } })
    const updated = await prisma.user.update({ where: { id }, data: { isActive: !now.isActive } })
    res.json(updated)
  } catch (e) {
    console.error('Error toggling active:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get all DHRU API configurations
export const getApiConfigs = async (req, res) => {
  try {
    const configs = await dhruAdminService.getApiConfigs()
    res.json(configs)
  } catch (error) {
    console.error('Error fetching API configs:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get a specific DHRU API configuration by ID
export const getApiConfigById = async (req, res) => {
  try {
    const { id } = req.params
    const config = await dhruAdminService.getApiConfigById(id)

    if (!config) {
      return res.status(404).json({ error: 'API configuration not found' })
    }

    res.json(config)
  } catch (error) {
    console.error('Error fetching API config:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create a new DHRU API configuration
export const createApiConfig = async (req, res) => {
  try {
    const { name, apiUrl, username, apiKey, isActive, isDefault } = req.body

    // Validate required fields
    if (!name || !apiUrl || !username || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const config = await dhruAdminService.createApiConfig({
      name,
      apiUrl,
      username,
      apiKey,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false
    })

    res.status(201).json(config)
  } catch (error) {
    console.error('Error creating API config:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update a DHRU API configuration
export const updateApiConfig = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const config = await dhruAdminService.updateApiConfig(id, updateData)

    if (!config) {
      return res.status(404).json({ error: 'API configuration not found' })
    }

    res.json(config)
  } catch (error) {
    console.error('Error updating API config:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Delete a DHRU API configuration
export const deleteApiConfig = async (req, res) => {
  try {
    const { id } = req.params

    const result = await dhruAdminService.deleteApiConfig(id)
    res.json({ success: true, message: 'API configuration deleted successfully' })
  } catch (error) {
    console.error('Error deleting API config:', error)
    if (error.message === 'Cannot delete the default API configuration') {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Set a DHRU API configuration as default
export const setDefaultApiConfig = async (req, res) => {
  try {
    const { id } = req.params

    const config = await dhruAdminService.setDefaultApiConfig(id)

    if (!config) {
      return res.status(404).json({ error: 'API configuration not found' })
    }

    res.json({ success: true, message: 'Default API configuration set successfully' })
  } catch (error) {
    console.error('Error setting default API config:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Test DHRU API connection
export const testApiConnection = async (req, res) => {
  try {
    const { apiUrl, username, apiKey } = req.body

    // Validate required fields
    if (!apiUrl || !username || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = await dhruAdminService.testApiConnection({
      apiUrl,
      username,
      apiKey
    })

    res.json(result)
  } catch (error) {
    console.error('Error testing API connection:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Sync services from DHRU API to database
export const syncServices = async (req, res) => {
  try {
    const { apiConfigId } = req.params

    // Check if user has admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    console.log(`Admin user ${req.user.id} initiating sync for API config ${apiConfigId}`)

    const result = await dhruAdminService.syncServices(apiConfigId)

    if (result.success) {
      res.json({
        success: true,
        message: result.message || `Successfully synced ${result.syncedCount} services`,
        syncedCount: result.syncedCount,
        errorCount: result.errorCount || 0,
        logs: result.logs || []
      })
    } else {
      res.status(500).json({
        error: result.error,
        message: result.message || 'Failed to sync services',
        logs: result.logs || []
      })
    }
  } catch (error) {
    console.error('Error syncing services:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred during sync'
    })
  }
}

// Get all services for an API configuration
export const getServicesByApiConfig = async (req, res) => {
  try {
    const { apiConfigId } = req.params

    const services = await dhruAdminService.getServicesByApiConfig(apiConfigId)
    res.json(services)
  } catch (error) {
    console.error('Error fetching services:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get services grouped by type
export const getServicesByType = async (req, res) => {
  try {
    const { apiConfigId, type } = req.params

    const services = await dhruAdminService.getServicesByType(apiConfigId, type)
    res.json(services)
  } catch (error) {
    console.error('Error fetching services by type:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get services grouped by group
export const getServicesByGroup = async (req, res) => {
  try {
    const { apiConfigId, groupId } = req.params

    const services = await dhruAdminService.getServicesByGroup(apiConfigId, groupId)
    res.json(services)
  } catch (error) {
    console.error('Error fetching services by group:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get active services
export const getActiveServices = async (req, res) => {
  try {
    const { apiConfigId } = req.params

    const services = await dhruAdminService.getActiveServices(apiConfigId)
    res.json(services)
  } catch (error) {
    console.error('Error fetching active services:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get all orders (admin only)
export const getAllOrders = async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    // Fetch all orders with user information
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // For each order that has a DHRU order ID, fetch the real-time status from DHRU
    const ordersWithRealTimeStatus = await Promise.all(orders.map(async (order) => {
      if (order.dhruOrderId) {
        try {
          // Fetch real-time status from DHRU
          const dhruOrderDetails = await dhruService.getImeiOrder(order.dhruOrderId)

          // Update the order with real-time DHRU status
          if (dhruOrderDetails?.SUCCESS && dhruOrderDetails.SUCCESS.length > 0) {
            // Map DHRU status codes to our status
            const dhruOrderStatus = dhruOrderDetails.SUCCESS[0]?.STATUS || '0'
            const realTimeStatus = mapDhruStatusToOrderStatus(dhruOrderStatus)

            // Return order with real-time status and DHRU details
            return {
              ...order,
              status: realTimeStatus,
              dhruResponse: { ...order.dhruResponse, orderDetails: dhruOrderDetails }
            }
          }
        } catch (error) {
          console.error(`Error fetching DHRU status for order ${order.id}:`, error)
          // Return order as is if DHRU fetch fails
          return order
        }
      }
      // Return order as is if no DHRU order ID
      return order
    }))

    res.json(ordersWithRealTimeStatus)
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update order status manually (admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    const { id } = req.params
    const { status, message } = req.body

    const allowedStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' })
    }

    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        publicMessage: message !== undefined ? message : existing.publicMessage
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating order status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
