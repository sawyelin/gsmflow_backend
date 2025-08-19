import { prisma } from '../lib/prisma.js';
import { dhruService } from '../services/dhruService.js';

// Map DHRU service types to our order types
const mapServiceTypeToOrderType = (serviceType) => {
  switch (serviceType?.toUpperCase()) {
    case 'IMEI':
      return 'FRP_UNLOCK';
    case 'SERVER':
      return 'FRP_UNLOCK';
    case 'REMOTE':
      return 'FRP_UNLOCK';
    case 'FILE':
      return 'FRP_UNLOCK';
    case 'ICLOUD_CHECK':
      return 'ICLOUD_CHECK';
    case 'SAMSUNG_KG_CHECK':
      return 'SAMSUNG_KG_CHECK';
    case 'SAMSUNG_INFO_CHECK':
      return 'SAMSUNG_INFO_CHECK';
    case 'MICLOUD_CHECK':
      return 'MICLOUD_CHECK';
    default:
      return 'FRP_UNLOCK';
  }
};

export const listOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    
    // For processing orders that have a DHRU order ID, fetch the real-time status from DHRU
    // and update the database if they've reached a final state
    const ordersWithUpdatedStatus = await Promise.all(orders.map(async (order) => {
      // Only fetch real-time status for orders that are still processing
      if (order.status === 'PROCESSING' && order.dhruOrderId) {
        try {
          // Fetch real-time status from DHRU
          const dhruOrderDetails = await dhruService.getImeiOrder(order.dhruOrderId);
          
          // Update the order with real-time DHRU status
          if (dhruOrderDetails?.SUCCESS && dhruOrderDetails.SUCCESS.length > 0) {
            // Map DHRU status codes to our status
            const dhruOrderStatus = dhruOrderDetails.SUCCESS[0]?.STATUS || '0';
            
            let newStatus = order.status; // Default to current status
            switch (dhruOrderStatus) {
              case '4': // Completed
                newStatus = 'COMPLETED';
                break;
              case '0': // Pending
              case '1': // In Progress
              case '2': // Waiting for Payment
                newStatus = 'PROCESSING';
                break;
              case '3': // Cancelled
              case '6': // Refunded
                newStatus = 'CANCELLED';
                break;
              case '5': // Partially Completed
              case '7': // Failed
                newStatus = 'FAILED';
                break;
              default:
                newStatus = 'PROCESSING';
            }
            
            // Only update the database if the status has changed to a final state
            if (newStatus !== 'PROCESSING') {
              const updatedOrder = await prisma.order.update({
                where: { id: order.id },
                data: {
                  status: newStatus,
                  dhruResponse: { ...order.dhruResponse, orderDetails: dhruOrderDetails },
                  completedAt: newStatus === 'COMPLETED' ? new Date() : order.completedAt
                }
              });
              return updatedOrder;
            } else {
              // Return order with real-time status but don't update database
              return {
                ...order,
                dhruResponse: { ...order.dhruResponse, orderDetails: dhruOrderDetails }
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching DHRU status for order ${order.id}:`, error);
          // Return order as is if DHRU fetch fails
          return order;
        }
      }
      // Return order as is if not processing or no DHRU order ID
      return order;
    }));
    
    res.json(ordersWithUpdatedStatus);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    // If order is processing and has a DHRU order ID, fetch the real-time status from DHRU
    // and update the database if it has reached a final state
    if (order.status === 'PROCESSING' && order.dhruOrderId) {
      try {
        // Fetch real-time status from DHRU
        const dhruOrderDetails = await dhruService.getImeiOrder(order.dhruOrderId);
        
        // Update the order with real-time DHRU status
        if (dhruOrderDetails?.SUCCESS && dhruOrderDetails.SUCCESS.length > 0) {
          // Map DHRU status codes to our status
          const dhruOrderStatus = dhruOrderDetails.SUCCESS[0]?.STATUS || '0';
          
          let newStatus = order.status; // Default to current status
          switch (dhruOrderStatus) {
            case '4': // Completed
              newStatus = 'COMPLETED';
              break;
            case '0': // Pending
            case '1': // In Progress
            case '2': // Waiting for Payment
              newStatus = 'PROCESSING';
              break;
            case '3': // Cancelled
            case '6': // Refunded
              newStatus = 'CANCELLED';
              break;
            case '5': // Partially Completed
            case '7': // Failed
              newStatus = 'FAILED';
              break;
            default:
              newStatus = 'PROCESSING';
          }
          
          // Only update the database if the status has changed to a final state
          if (newStatus !== 'PROCESSING') {
            const updatedOrder = await prisma.order.update({
              where: { id: order.id },
              data: {
                status: newStatus,
                dhruResponse: { ...order.dhruResponse, orderDetails: dhruOrderDetails },
                completedAt: newStatus === 'COMPLETED' ? new Date() : order.completedAt
              }
            });
            return res.json(updatedOrder);
          } else {
            // Return order with real-time status but don't update database
            return res.json({
              ...order,
              dhruResponse: { ...order.dhruResponse, orderDetails: dhruOrderDetails }
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching DHRU status for order ${order.id}:`, error);
        // Return order as is if DHRU fetch fails
        return res.json(order);
      }
    }
    // Return order as is if not processing or no DHRU order ID
    return res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { price, imei, deviceModel = '', serviceId, serviceName, serviceType, customFields, quantity, dhruParams } = req.body;
    if (typeof price !== 'number' || price < 0) return res.status(400).json({ error: 'Invalid price' });
    const order = await prisma.$transaction(async (tx) => {
      const [user] = await tx.$queryRawUnsafe(`SELECT id, balance FROM "users" WHERE id = $1 FOR UPDATE`, req.user.id);
      if (!user) throw new Error('User not found');
      if (price > 0 && Number(user.balance) < price) throw new Error('Insufficient balance');
      if (price > 0) {
        await tx.user.update({ where: { id: req.user.id }, data: { balance: { decrement: price } } });
      }
      return tx.order.create({
        data: {
          userId: req.user.id,
          orderType: mapServiceTypeToOrderType(serviceType),
          status: 'PENDING',
          deviceModel,
          imei,
          price,
          serviceData: { serviceId, serviceName, serviceType, customFields, quantity, dhruParams }
        }
      });
    });
    res.json(order);
  } catch (e) {
    if (e.message === 'Insufficient balance') return res.status(400).json({ error: e.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'Cannot cancel' });
    await prisma.$transaction(async (tx) => {
      if (order.price > 0) {
        await tx.user.update({ where: { id: req.user.id }, data: { balance: { increment: order.price } } });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const placeOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) return res.status(404).json({ error: 'Not found' });
    const sd = order.serviceData || {};
    
    // Build DHRU API parameters according to their specification
    const params = { service_id: sd.serviceId };
    
    // Add IMEI for IMEI services
    if (order.imei) params.imei = order.imei;
    
    // Add model if available
    if (order.deviceModel) params.model = order.deviceModel;
    
    // Add IMEI for IMEI services
    if (order.imei) params.IMEI = order.imei;
    
    // Add quantity if specified
    if (sd.quantity && sd.quantity > 1) params.QNT = String(sd.quantity);
    
    // Add DHRU parameters from frontend
    if (sd.dhruParams) {
      Object.entries(sd.dhruParams).forEach(([key, value]) => {
        if (value) {
          params[key] = value;
        }
      });
    }
    
    // Add custom fields as base64 encoded JSON if present
    // Add a unique identifier to prevent DHRU from treating orders as duplicates
    if (sd.customFields && Object.keys(sd.customFields).length > 0) {
      const customFieldsData = {};
      Object.entries(sd.customFields).forEach(([key, value]) => {
        if (key !== 'notes' && value) {
          customFieldsData[key] = value;
        }
      });
      
      // Add a unique identifier to prevent duplicate order detection
      customFieldsData.OrderUniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      customFieldsData.Username = 'AungThu';
      
      if (Object.keys(customFieldsData).length > 0) {
        const customFieldsJson = JSON.stringify(customFieldsData);
        params.CUSTOMFIELD = Buffer.from(customFieldsJson).toString('base64');
      }
    } else {
      // Even if no custom fields are provided, add a unique identifier to prevent duplicates
      const customFieldsData = {
        OrderUniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        Username: 'AungThu'
      };
      const customFieldsJson = JSON.stringify(customFieldsData);
      params.CUSTOMFIELD = Buffer.from(customFieldsJson).toString('base64');
    }
    
    console.log('DHRU API Parameters:', params);
    const dhru = await dhruService.placeOrder(params);
    console.log('DHRU Response:', dhru);
    
    // Check if DHRU order was successful
    const isSuccessful = dhru?.SUCCESS && dhru.SUCCESS.length > 0;
    const dhruOrderId = dhru?.SUCCESS?.[0]?.REFERENCEID;
    
    // Check if this DHRU order ID already exists in the database
    let uniqueDhruOrderId = dhruOrderId;
    if (dhruOrderId) {
      try {
        // Try to find an existing order with this DHRU order ID
        const existingOrder = await prisma.order.findFirst({
          where: { dhruOrderId: dhruOrderId }
        });
        
        // If an order with this DHRU order ID already exists, append a suffix to make it unique
        if (existingOrder) {
          uniqueDhruOrderId = `${dhruOrderId}-dup-${Date.now()}`;
        }
      } catch (error) {
        console.error('Error checking for duplicate DHRU order ID:', error);
        // If there's an error checking for duplicates, we'll use the original ID
      }
    }
    
    // If DHRU responded with credit error, fail gracefully with a friendly message
    const friendlyCreditError = 'Sorry Your Order Is Faild From Serverside PleaseContact Us';
    const hasCreditError = Array.isArray(dhru?.ERROR) && dhru.ERROR.some((e) => {
      const msg = String(e?.MESSAGE || '').toLowerCase();
      const full = String(e?.FULL_DESCRIPTION || '').toLowerCase();
      return msg === 'creditprocesserror' || full.includes('not enough credit') || full.includes('enough credit');
    });
    if (hasCreditError) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          dhruOrderId: uniqueDhruOrderId,
          dhruResponse: dhru,
          completedAt: null,
          publicMessage: friendlyCreditError,
        },
      });
      return res.json(updated);
    }

    // For server services and other non-IMEI services, we should keep them as PROCESSING
    // and let the status check function handle the actual status updates
    let status, completedAt;
    
    // Only mark as completed immediately for services that complete instantly
    // For most services, we'll wait for DHRU to process them
    if (isSuccessful) {
      // Check if this is an instant service (like some check services)
      const isInstantService = sd.serviceType && (
        sd.serviceType.toUpperCase().includes('CHECK') ||
        sd.serviceType.toUpperCase().includes('INFO')
      );
      
      if (isInstantService) {
        status = 'COMPLETED';
        completedAt = new Date();
      } else {
        status = 'PROCESSING';
        completedAt = null;
      }
    } else {
      status = 'FAILED';
      completedAt = null;
    }
    
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: status,
        dhruOrderId: uniqueDhruOrderId,
        dhruResponse: dhru,
        completedAt: completedAt
      }
    });
    res.json(updated);
  } catch (e) {
    console.error('DHRU Error:', e);
    res.status(502).json({ error: 'DHRU error: ' + e.message });
  }
};

export const checkOrderStatus = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    if (!order.dhruOrderId) {
      return res.status(400).json({ error: 'No DHRU order ID found' });
    }
    
    // Check status with DHRU API using getimeiorder endpoint
    const dhruOrderDetails = await dhruService.getImeiOrder(order.dhruOrderId);
    console.log('DHRU Order Details Response:', dhruOrderDetails);
    
    // Update order status based on DHRU response
    let newStatus = order.status;
    if (dhruOrderDetails?.SUCCESS && dhruOrderDetails.SUCCESS.length > 0) {
      // Check the status from DHRU response
      const dhruOrderStatus = dhruOrderDetails.SUCCESS[0]?.STATUS || '0';
      
      // Map DHRU status codes to our status
      // Based on DHRU documentation and user feedback:
      // STATUS: '0' = Pending
      // STATUS: '1' = In Progress
      // STATUS: '2' = Waiting for Payment
      // STATUS: '3' = Cancelled
      // STATUS: '4' = Completed
      // STATUS: '5' = Partially Completed
      // STATUS: '6' = Refunded
      // STATUS: '7' = Failed
      switch (dhruOrderStatus) {
        case '4': // Completed
          newStatus = 'COMPLETED';
          break;
        case '0': // Pending
        case '1': // In Progress
        case '2': // Waiting for Payment
          newStatus = 'PROCESSING';
          break;
        case '3': // Cancelled
        case '6': // Refunded
          newStatus = 'CANCELLED';
          break;
        case '5': // Partially Completed
        case '7': // Failed
          newStatus = 'FAILED';
          break;
        default:
          newStatus = 'PROCESSING';
      }
    }
    
    // Only update the database if the status has actually changed to a final state (COMPLETED, FAILED, CANCELLED)
    // or if this is the first time we're getting the DHRU response
    const shouldUpdateDatabase =
      (newStatus === 'COMPLETED' || newStatus === 'FAILED' || newStatus === 'CANCELLED') ||
      (!order.dhruResponse?.orderDetails && dhruOrderDetails);
    
    if (shouldUpdateDatabase) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          dhruResponse: { ...order.dhruResponse, orderDetails: dhruOrderDetails },
          completedAt: newStatus === 'COMPLETED' ? new Date() : order.completedAt
        }
      });
      
      res.json(updated);
    } else {
      // Return the order with updated status but don't persist to database
      res.json({
        ...order,
        status: newStatus,
        dhruResponse: { ...order.dhruResponse, orderDetails: dhruOrderDetails }
      });
    }
  } catch (e) {
    console.error('Status Check Error:', e);
    res.status(502).json({ error: 'Status check error: ' + e.message });
  }
};


