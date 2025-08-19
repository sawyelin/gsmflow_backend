import { prisma } from '../lib/prisma.js'
import { dhruService as dhruApiClient } from './dhruService.js'

class DhruAdminService {
  // Get all DHRU API configurations
  async getApiConfigs () {
    return await prisma.dhruApiConfig.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  // Get a specific DHRU API configuration by ID
  async getApiConfigById (id) {
    return await prisma.dhruApiConfig.findUnique({
      where: { id }
    })
  }

  // Create a new DHRU API configuration
  async createApiConfig (data) {
    // If this is set as default, unset the current default
    if (data.isDefault) {
      await prisma.dhruApiConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    return await prisma.dhruApiConfig.create({
      data
    })
  }

  // Update a DHRU API configuration
  async updateApiConfig (id, data) {
    // If this is set as default, unset the current default
    if (data.isDefault) {
      await prisma.dhruApiConfig.updateMany({
        where: {
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      })
    }

    return await prisma.dhruApiConfig.update({
      where: { id },
      data
    })
  }

  // Delete a DHRU API configuration
  async deleteApiConfig (id) {
    // Check if this is the default config
    const config = await prisma.dhruApiConfig.findUnique({
      where: { id }
    })

    if (config.isDefault) {
      throw new Error('Cannot delete the default API configuration')
    }

    return await prisma.dhruApiConfig.delete({
      where: { id }
    })
  }

  // Set a DHRU API configuration as default
  async setDefaultApiConfig (id) {
    // Unset current default
    await prisma.dhruApiConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    })

    // Set new default
    return await prisma.dhruApiConfig.update({
      where: { id },
      data: { isDefault: true }
    })
  }

  // Test DHRU API connection
  async testApiConnection (config) {
    try {
      // Create a temporary DHRU service client with the provided config
      // For now, we'll just test the account info endpoint
      const testService = {
        accountInfo: () => dhruApiClient.accountInfo()
      }

      const response = await testService.accountInfo()
      return {
        success: true,
        response
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Sync services from DHRU API to JSON fields on DhruApiConfig (no DhruService table)
  async syncServices (apiConfigId) {
    // Collect logs during sync process
    const logs = []
    const log = (message, type = 'info') => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        type
      }
      logs.push(logEntry)
      console.log(`[${type.toUpperCase()}] ${message}`)
    }

    try {
      log(`Starting sync for API config: ${apiConfigId}`)

      const apiConfig = await prisma.dhruApiConfig.findUnique({
        where: { id: apiConfigId }
      })

      if (!apiConfig) {
        throw new Error('API configuration not found')
      }

      if (!apiConfig.isActive) {
        throw new Error('API configuration is not active')
      }

      // Fetch services from DHRU API
      log('Fetching IMEI services from DHRU API...')
      const servicesResponse = await dhruApiClient.servicesList()
      log('IMEI services response received')

      log('Fetching FILE services from DHRU API...')
      const fileServicesResponse = await dhruApiClient.fileServices()
      log('FILE services response received')

      let syncedCount = 0
      let errorCount = 0

      // Prepare data structures for JSON storage
      const imeiServicesData = {}
      const serverServicesData = {}
      const remoteServicesData = {}
      const fileServicesData = {}

      // Process IMEI, SERVER, and REMOTE services
      if (servicesResponse?.SUCCESS?.[0]?.LIST) {
        const serviceGroups = servicesResponse.SUCCESS[0].LIST
        log(`Found ${Object.keys(serviceGroups).length} service groups`)

        for (const [groupName, group] of Object.entries(serviceGroups)) {
          try {
            // Skip groups with null or undefined services
            if (!group || !group.SERVICES) {
              log(`Skipping group ${groupName} - no services found`, 'warn')
              continue
            }

            const groupType = group.GROUPTYPE
            log(`Processing group: ${groupName} (${groupType}) with ${Object.keys(group.SERVICES).length} services`)

            // Store group data for JSON storage
            if (groupType === 'IMEI') {
              imeiServicesData[groupName] = group
            } else if (groupType === 'SERVER') {
              serverServicesData[groupName] = group
            } else if (groupType === 'REMOTE') {
              remoteServicesData[groupName] = group
            }

            for (const [serviceId, service] of Object.entries(group.SERVICES)) {
              // Count valid services
              if (!service) {
                log(`Skipping service ${serviceId} in group ${groupName} - service is null/undefined`, 'warn')
                continue
              }
              syncedCount++
            }
          } catch (groupError) {
            log(`Error processing group ${groupName}: ${groupError.message}`, 'error')
            errorCount++
          }
        }
      } else {
        log('No IMEI services found in response', 'warn')
      }

      // Process FILE services
      if (fileServicesResponse?.SUCCESS?.[0]?.LIST) {
        const fileServiceGroups = fileServicesResponse.SUCCESS[0].LIST
        log(`Found ${Object.keys(fileServiceGroups).length} file service groups`)

        // Store file services data for JSON storage
        Object.assign(fileServicesData, fileServiceGroups)

        for (const [groupName, group] of Object.entries(fileServiceGroups)) {
          try {
            // Skip groups with null or undefined services
            if (!group || !group.SERVICES) {
              log(`Skipping file service group ${groupName} - no services found`, 'warn')
              continue
            }

            log(`Processing file service group: ${groupName} with ${Object.keys(group.SERVICES).length} services`)

            for (const [serviceId, service] of Object.entries(group.SERVICES)) {
              if (!service) {
                log(`Skipping file service ${serviceId} in group ${groupName} - service is null/undefined`, 'warn')
                continue
              }
              syncedCount++
            }
          } catch (groupError) {
            log(`Error processing file service group ${groupName}: ${groupError.message}`, 'error')
            errorCount++
          }
        }
      } else {
        log('No FILE services found in response', 'warn')
      }

      // Update sync timestamp and JSON data only (no DhruService rows)
      log('Updating API configuration with sync timestamp and JSON data...')
      await prisma.dhruApiConfig.update({
        where: { id: apiConfigId },
        data: {
          updatedAt: new Date(),
          servicesSyncedAt: new Date(),
          imeiServicesData: Object.keys(imeiServicesData).length > 0 ? imeiServicesData : null,
          serverServicesData: Object.keys(serverServicesData).length > 0 ? serverServicesData : null,
          remoteServicesData: Object.keys(remoteServicesData).length > 0 ? remoteServicesData : null,
          fileServicesData: Object.keys(fileServicesData).length > 0 ? fileServicesData : null
        }
      })

      log(`Sync completed. Success: ${syncedCount}, Errors: ${errorCount}`)

      // Record sync history (success)
      try {
        await prisma.serviceSyncLog.create({
          data: {
            apiConfigId,
            success: true,
            syncedCount,
            errorCount,
            message: `Synced ${syncedCount} services with ${errorCount} errors`
          }
        })
      } catch (logErr) {
        console.warn('Failed to write ServiceSyncLog (success):', logErr?.message || logErr)
      }

      return {
        success: true,
        syncedCount,
        errorCount,
        logs,
        message: `Successfully synced ${syncedCount} services with ${errorCount} errors`
      }
    } catch (error) {
      log(`Error syncing services: ${error.message}`, 'error')
      // Record sync history (failure)
      try {
        await prisma.serviceSyncLog.create({
          data: {
            apiConfigId,
            success: false,
            syncedCount: 0,
            errorCount: 1,
            message: error.message?.slice(0, 500) || 'Sync failed'
          }
        })
      } catch (logErr) {
        console.warn('Failed to write ServiceSyncLog (failure):', logErr?.message || logErr)
      }
      return {
        success: false,
        error: error.message,
        logs,
        message: `Failed to sync services: ${error.message}`
      }
    }
  }

  // Helper method to extract requirements from service
  extractRequirements (service) {
    const requirements = {}

    if (service['Requires.Network']) requirements.network = service['Requires.Network']
    if (service['Requires.Mobile']) requirements.mobile = service['Requires.Mobile']
    if (service['Requires.Provider']) requirements.provider = service['Requires.Provider']
    if (service['Requires.PIN']) requirements.pin = service['Requires.PIN']
    if (service['Requires.KBH']) requirements.kbh = service['Requires.KBH']
    if (service['Requires.MEP']) requirements.mep = service['Requires.MEP']
    if (service['Requires.PRD']) requirements.prd = service['Requires.PRD']
    if (service['Requires.Type']) requirements.type = service['Requires.Type']
    if (service['Requires.Locks']) requirements.locks = service['Requires.Locks']
    if (service['Requires.Reference']) requirements.reference = service['Requires.Reference']
    if (service['Requires.SN']) requirements.sn = service['Requires.SN']
    if (service['Requires.SecRO']) requirements.secro = service['Requires.SecRO']
    if (service['Requires.Custom']) requirements.custom = service['Requires.Custom']

    return Object.keys(requirements).length > 0 ? requirements : null
  }

  // Flatten JSON groups from DhruApiConfig into service rows matching frontend expectations
  buildServiceRowsFromConfig (config) {
    const rows = []
    const addGroupMap = (groupMap, typeHint) => {
      if (!groupMap) return
      for (const [groupName, group] of Object.entries(groupMap)) {
        const services = group?.SERVICES || {}
        for (const [sid, s] of Object.entries(services)) {
          if (!s) continue
          rows.push({
            // No DB id since we do not store per-service rows now
            id: undefined,
            apiConfigId: config.id,
            serviceId: String(s.SERVICEID ?? sid),
            name: s.SERVICENAME || '',
            description: s.INFO || '',
            type: s.SERVICETYPE || group.GROUPTYPE || typeHint || 'IMEI',
            groupId: groupName,
            groupName,
            price: typeof s.CREDIT === 'number' ? s.CREDIT : parseFloat(s.CREDIT) || 0,
            credit: typeof s.CREDIT === 'number' ? s.CREDIT : parseFloat(s.CREDIT) || 0,
            deliveryTime: s.TIME || '',
            minQuantity: s.MINQNT ? parseInt(s.MINQNT) : null,
            maxQuantity: s.MAXQNT ? parseInt(s.MAXQNT) : null,
            supportsCustomFields: !!(s.CUSTOM && s.CUSTOM.allow === '1'),
            customFields: s.CUSTOM || null,
            requires: this.extractRequirements(s),
            isActive: true,
            syncedAt: config.servicesSyncedAt || null,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
          })
        }
      }
    }
    addGroupMap(config.imeiServicesData, 'IMEI')
    addGroupMap(config.serverServicesData, 'SERVER')
    addGroupMap(config.remoteServicesData, 'REMOTE')
    addGroupMap(config.fileServicesData, 'FILE')
    return rows
  }

  // Get all services for an API configuration from JSON
  async getServicesByApiConfig (apiConfigId) {
    const config = await prisma.dhruApiConfig.findUnique({ where: { id: apiConfigId } })
    if (!config) return []
    return this.buildServiceRowsFromConfig(config).sort((a, b) => (a.groupName || '').localeCompare(b.groupName || ''))
  }

  // Get services grouped by type
  async getServicesByType (apiConfigId, type) {
    const all = await this.getServicesByApiConfig(apiConfigId)
    return all.filter(s => s.type === type)
  }

  // Get services grouped by group
  async getServicesByGroup (apiConfigId, groupId) {
    const all = await this.getServicesByApiConfig(apiConfigId)
    return all.filter(s => s.groupId === groupId).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }

  // Get active services
  async getActiveServices (apiConfigId) {
    const all = await this.getServicesByApiConfig(apiConfigId)
    return all.filter(s => s.isActive)
  }
}

export const dhruAdminService = new DhruAdminService()
