import { dhruService } from '../services/dhruService.js';
import { prisma } from '../lib/prisma.js';

export const status = async (req, res) => {
  const start = Date.now();
  try {
    await dhruService.accountInfo();
    res.json({ isOnline: true, uptime: '100%', responseTime: Date.now() - start, lastChecked: new Date().toISOString() });
  } catch (e) {
    res.json({ isOnline: false, uptime: '0%', responseTime: Date.now() - start, lastChecked: new Date().toISOString() });
  }
};

export const accountInfo = async (req, res) => {
  try { 
    const data = await dhruService.accountInfo(); 
    res.json(data); 
  }
  catch (e) { 
    res.status(502).json({ error: 'DHRU error' }); 
  }
};

export const services = async (req, res) => {
  try {
    // Get the default API configuration
    const defaultApiConfig = await prisma.dhruApiConfig.findFirst({
      where: { isDefault: true, isActive: true }
    });
    
    if (!defaultApiConfig) {
      // If no default config, get any active config
      const activeApiConfig = await prisma.dhruApiConfig.findFirst({
        where: { isActive: true }
      });
      
      if (!activeApiConfig) {
        return res.status(404).json({ error: 'No active DHRU API configuration found' });
      }
      
      // Get services from JSON columns
      const servicesData = {
        imei: activeApiConfig.imeiServicesData,
        server: activeApiConfig.serverServicesData,
        remote: activeApiConfig.remoteServicesData
      };
      
      // Format services to match DHRU API response structure
      return res.json(formatServicesForResponseFromJson(servicesData));
    }
    
    // Get services from JSON columns
    const servicesData = {
      imei: defaultApiConfig.imeiServicesData,
      server: defaultApiConfig.serverServicesData,
      remote: defaultApiConfig.remoteServicesData
    };
    
    // Format services to match DHRU API response structure
    res.json(formatServicesForResponseFromJson(servicesData));
  } catch (e) {
    console.error('Error fetching services from database:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const fileServices = async (req, res) => {
  try {
    // Get the default API configuration
    const defaultApiConfig = await prisma.dhruApiConfig.findFirst({
      where: { isDefault: true, isActive: true }
    });
    
    if (!defaultApiConfig) {
      // If no default config, get any active config
      const activeApiConfig = await prisma.dhruApiConfig.findFirst({
        where: { isActive: true }
      });
      
      if (!activeApiConfig) {
        return res.status(404).json({ error: 'No active DHRU API configuration found' });
      }
      
      // Get file services from JSON columns
      const fileServicesData = activeApiConfig.fileServicesData;
      
      // Format file services to match DHRU API response structure
      return res.json(formatFileServicesForResponseFromJson(fileServicesData));
    }
    
    // Get file services from JSON columns
    const fileServicesData = defaultApiConfig.fileServicesData;
    
    // Format file services to match DHRU API response structure
    res.json(formatFileServicesForResponseFromJson(fileServicesData));
  } catch (e) {
    console.error('Error fetching file services from database:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Fetch live services directly from DHRU API (no database)
export const liveServices = async (req, res) => {
  try {
    const data = await dhruService.servicesList();
    // Return raw DHRU response so the frontend can parse group/type/service count
    return res.json(data);
  } catch (e) {
    console.error('Error fetching live services from DHRU:', e);
    return res.status(502).json({ error: 'DHRU error', message: e.message });
  }
};

export const placeOrder = async (req, res) => {
  try {
    const { serviceType, ...parameters } = req.body || {};
    
    let data;
    switch (serviceType) {
      case 'SERVER':
        data = await dhruService.placeServerOrder(parameters);
        break;
      case 'FILE':
        data = await dhruService.placeFileOrder(parameters);
        break;
      case 'REMOTE':
        data = await dhruService.placeRemoteOrder(parameters);
        break;
      case 'IMEI':
      default:
        data = await dhruService.placeOrder(parameters);
        break;
    }
    
    res.json(data);
  }
  catch (e) {
    console.error('Error placing order:', e);
    res.status(502).json({ error: 'DHRU error', message: e.message });
  }
};

export const placeBulkOrder = async (req, res) => {
  try { 
    const data = await dhruService.placeBulkOrder(req.body || []); 
    res.json(data); 
  }
  catch (e) { 
    res.status(502).json({ error: 'DHRU error' }); 
  }
};

// Helper function to format services to match DHRU API response structure
const formatServicesForResponse = (services) => {
  // Group services by group name and type
  const groupedServices = {};
  
  services.forEach(service => {
    if (!groupedServices[service.groupName]) {
      groupedServices[service.groupName] = {
        GROUPTYPE: service.type,
        SERVICES: {}
      };
    }
    
    groupedServices[service.groupName].SERVICES[service.serviceId] = {
      SERVICEID: parseInt(service.serviceId),
      SERVICETYPE: service.type,
      SERVICENAME: service.name,
      CREDIT: service.credit,
      TIME: service.deliveryTime || '',
      INFO: service.description || '',
      ...formatRequirements(service.requires)
    };
  });
  
  return {
    SUCCESS: [
      {
        MESSAGE: 'Services List',
        LIST: groupedServices
      }
    ]
  };
};

// Helper function to format file services to match DHRU API response structure
const formatFileServicesForResponse = (services) => {
  // Group file services by group name
  const groupedServices = {};
  
  services.forEach(service => {
    if (!groupedServices[service.groupName]) {
      groupedServices[service.groupName] = {
        SERVICES: {}
      };
    }
    
    groupedServices[service.groupName].SERVICES[service.serviceId] = {
      SERVICEID: parseInt(service.serviceId),
      SERVICENAME: service.name,
      CREDIT: service.credit,
      TIME: service.deliveryTime || '',
      INFO: service.description || '',
      ALLOW_EXTENSION: '' // This would need to be added to the database model
    };
  });
  
  return {
    SUCCESS: [
      {
        MESSAGE: 'File Services List',
        LIST: groupedServices
      }
    ]
  };
};

// Helper function to format requirements
const formatRequirements = (requires) => {
  if (!requires) return {};
  
  const formatted = {};
  
  if (requires.network) formatted['Requires.Network'] = requires.network;
  if (requires.mobile) formatted['Requires.Mobile'] = requires.mobile;
  if (requires.provider) formatted['Requires.Provider'] = requires.provider;
  if (requires.pin) formatted['Requires.PIN'] = requires.pin;
  if (requires.kbh) formatted['Requires.KBH'] = requires.kbh;
  if (requires.mep) formatted['Requires.MEP'] = requires.mep;
  if (requires.prd) formatted['Requires.PRD'] = requires.prd;
  if (requires.type) formatted['Requires.Type'] = requires.type;
  if (requires.locks) formatted['Requires.Locks'] = requires.locks;
  if (requires.reference) formatted['Requires.Reference'] = requires.reference;
  if (requires.sn) formatted['Requires.SN'] = requires.sn;
  if (requires.secro) formatted['Requires.SecRO'] = requires.secro;
  if (requires.custom) formatted['Requires.Custom'] = requires.custom;
  
  return formatted;
};

// Helper function to format services to match DHRU API response structure from JSON data
const formatServicesForResponseFromJson = (servicesData) => {
  // Combine all service types into a single structure
  const groupedServices = {};
  
  // Process IMEI services
  if (servicesData.imei) {
    Object.assign(groupedServices, servicesData.imei);
  }
  
  // Process SERVER services
  if (servicesData.server) {
    Object.assign(groupedServices, servicesData.server);
  }
  
  // Process REMOTE services
  if (servicesData.remote) {
    Object.assign(groupedServices, servicesData.remote);
  }
  
  return {
    SUCCESS: [
      {
        MESSAGE: 'Services List',
        LIST: groupedServices
      }
    ]
  };
};

// Helper function to format file services to match DHRU API response structure from JSON data
const formatFileServicesForResponseFromJson = (fileServicesData) => {
  if (!fileServicesData) {
    return {
      SUCCESS: [
        {
          MESSAGE: 'File Services List',
          LIST: {}
        }
      ]
    };
  }
  
  return {
    SUCCESS: [
      {
        MESSAGE: 'File Services List',
        LIST: fileServicesData
      }
    ]
  };
};
