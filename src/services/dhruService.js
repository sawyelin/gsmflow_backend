import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/env.js';

const request = async (action, params = {}) => {
  const form = new FormData();
  form.append('username', config.dhru.username);
  form.append('apiaccesskey', config.dhru.apiKey);
  form.append('requestformat', 'JSON');
  form.append('action', action);
  Object.entries(params).forEach(([k, v]) => form.append(k, v));
  
  const url = `${config.dhru.apiUrl}/api/index.php`;
  const res = await axios.post(url, form, { headers: form.getHeaders() });
  return res.data;
};

const toXmlParameters = (obj) => {
  let xml = '<PARAMETERS>';
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) xml += `<${k.toUpperCase()}>${v}</${k.toUpperCase()}>`;
  });
  xml += '</PARAMETERS>';
  return xml;
};

export const dhruService = {
  accountInfo: () => request('accountinfo'),
  servicesList: () => request('imeiservicelist'),
  fileServices: () => request('fileservicelist'),
  placeOrder: (parameters) => {
    // For IMEI orders, map ID to service_id if needed
    const params = { ...parameters };
    if (params.ID && !params.service_id) {
      params.service_id = params.ID;
      delete params.ID;
    }
    return request('placeimeiorder', { parameters: toXmlParameters(params) });
  },
  placeServerOrder: (parameters) => {
    // For SERVER orders, map ID to service_id if needed
    const params = { ...parameters };
    if (params.ID && !params.service_id) {
      params.service_id = params.ID;
      delete params.ID;
    }
    return request('placeimeiorder', { parameters: toXmlParameters(params) });
  },
  placeFileOrder: (parameters) => {
    // For FILE orders, map ID to service_id if needed
    const params = { ...parameters };
    if (params.ID && !params.service_id) {
      params.service_id = params.ID;
      delete params.ID;
    }
    return request('placefileorder', { parameters: toXmlParameters(params) });
  },
  placeRemoteOrder: (parameters) => {
    // For REMOTE orders, map ID to service_id if needed
    const params = { ...parameters };
    if (params.ID && !params.service_id) {
      params.service_id = params.ID;
      delete params.ID;
    }
    return request('placeremoteorder', { parameters: toXmlParameters(params) });
  },
  placeBulkOrder: (orders) => request('placeimeiorderbulk', { parameters: Buffer.from(JSON.stringify(orders)).toString('base64') }),
  checkOrderStatus: (referenceId) => request('checkorderstatus', { referenceid: referenceId }),
  getImeiOrder: (orderId) => request('getimeiorder', { parameters: toXmlParameters({ id: orderId }) }),
  getFileOrder: (orderId) => request('getfileorder', { parameters: toXmlParameters({ id: orderId }) }),
  getServerOrder: (orderId) => request('getserverorder', { parameters: toXmlParameters({ id: orderId }) }),
};


