// Flow CMMS - API Service Client (Vanilla JS)
const API_BASE_URL = window.location.origin;

// Tenant Session Storage
export const getActiveTenant = () => localStorage.getItem('flow_cmms_active_tenant') || '';
export const setActiveTenant = (slug) => localStorage.setItem('flow_cmms_active_tenant', slug);
export const removeActiveTenant = () => localStorage.removeItem('flow_cmms_active_tenant');

// CMMS Tenant Token Storage
export const getToken = () => localStorage.getItem('flow_cmms_token');
export const setToken = (token) => localStorage.setItem('flow_cmms_token', token);
export const removeToken = () => localStorage.removeItem('flow_cmms_token');

export const getUser = () => {
  const u = localStorage.getItem('flow_cmms_user');
  return u ? JSON.parse(u) : null;
};
export const setUser = (user) => localStorage.setItem('flow_cmms_user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('flow_cmms_user');

// Master Manager User & Token Storage
export const getManagerToken = () => localStorage.getItem('flow_cmms_manager_token');
export const setManagerToken = (token) => localStorage.setItem('flow_cmms_manager_token', token);
export const removeManagerToken = () => localStorage.removeItem('flow_cmms_manager_token');

export const getManagerUser = () => {
  const u = localStorage.getItem('flow_cmms_manager_user');
  return u ? JSON.parse(u) : null;
};
export const setManagerUser = (user) => localStorage.setItem('flow_cmms_manager_user', JSON.stringify(user));
export const removeManagerUser = () => localStorage.removeItem('flow_cmms_manager_user');

async function request(endpoint, options = {}) {
  const token = getToken();
  const activeTenant = getActiveTenant();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (activeTenant) {
    headers['X-Tenant-ID'] = activeTenant;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    removeToken();
    removeUser();
    window.location.hash = '#login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    let msg = `Erro HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        msg = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : errorData.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
      }
    } catch (e) {}
    throw new Error(msg);
  }

  return response.json();
}

async function managerRequest(endpoint, options = {}) {
  const token = getManagerToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    removeManagerToken();
    removeManagerUser();
    window.location.hash = '#manager-login';
    throw new Error('Sessão de gerenciador expirada.');
  }

  if (!response.ok) {
    let msg = `Erro HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        msg = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : errorData.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
      }
    } catch (e) {}
    throw new Error(msg);
  }

  return response.json();
}

export const api = {
  // Master Manager API
  managerLogin: async (username, password) => {
    const data = await managerRequest('/api/manager/auth/token', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setManagerToken(data.access_token);
    setManagerUser(data.user);
    return data;
  },
  managerLogout: () => {
    removeManagerToken();
    removeManagerUser();
  },
  getManagerMe: () => managerRequest('/api/manager/auth/me'),
  changeManagerPassword: (current_password, new_password) => managerRequest('/api/manager/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password })
  }),
  getTenants: () => managerRequest('/api/manager/tenants'),

  createTenant: (data) => managerRequest('/api/manager/tenants', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteTenant: (id) => managerRequest(`/api/manager/tenants/${id}?drop_database=true`, {
    method: 'DELETE'
  }),
  getTenantUsers: (tenantId) => managerRequest(`/api/manager/tenants/${tenantId}/users`),
  createTenantUser: (tenantId, data) => managerRequest(`/api/manager/tenants/${tenantId}/users`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateTenantUser: (tenantId, userId, data) => managerRequest(`/api/manager/tenants/${tenantId}/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteTenantUser: (tenantId, userId) => managerRequest(`/api/manager/tenants/${tenantId}/users/${userId}`, {
    method: 'DELETE'
  }),
  regenerateTenantUserToken: (tenantId, userId) => managerRequest(`/api/manager/tenants/${tenantId}/users/${userId}/regenerate-token`, {
    method: 'POST'
  }),
  getManagerUsers: () => managerRequest('/api/manager/users'),

  createManagerUser: (data) => managerRequest('/api/manager/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateManagerUser: (id, data) => managerRequest(`/api/manager/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteManagerUser: (id) => managerRequest(`/api/manager/users/${id}`, {
    method: 'DELETE'
  }),
  generateTenantMCPToken: (tenantId) => managerRequest(`/api/manager/tenants/${tenantId}/mcp-token`, {
    method: 'POST'
  }),

  // CMMS Tenant Auth & Admin
  login: async (username, password) => {
    const data = await request('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(data.access_token);
    try {
      const profile = await request('/api/auth/me');
      setUser(profile);
      return { token: data.access_token, user: profile };
    } catch (e) {
      const defaultUser = { username, role: 'admin' };
      setUser(defaultUser);
      return { token: data.access_token, user: defaultUser };
    }
  },
  getCurrentUser: () => request('/api/auth/me'),
  changePassword: (current_password, new_password) => request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password })
  }),
  logout: () => {
    removeToken();
    removeUser();
    window.location.hash = '#login';
  },
  getTenantInfo: async (slug) => {
    if (!slug) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/tenant-info?s=${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },


  // Equipment Assets
  getEquipment: (params = '') => request(`/api/equipment/${params}`),
  getEquipmentById: (id) => request(`/api/equipment/${id}`),
  createEquipment: (data) => request('/api/equipment/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateEquipment: (id, data) => request(`/api/equipment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteEquipment: (id) => request(`/api/equipment/${id}`, {
    method: 'DELETE'
  }),
  getMaintenanceHistory: (equipmentId) => request(`/api/reports/maintenance-history/${equipmentId}`),


  // Maintenance OS
  getMaintenance: (params = '') => request(`/api/maintenance/${params}`),
  getMaintenanceById: (id) => request(`/api/maintenance/${id}`),
  createMaintenance: (data) => request('/api/maintenance/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateMaintenance: (id, data) => request(`/api/maintenance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  addMaintenanceEntry: (maintenanceId, entryData) => request(`/api/maintenance/${maintenanceId}/entries`, {
    method: 'POST',
    body: JSON.stringify(entryData)
  }),
  requesterLogin: async (username, full_name = '', sector = '', contact = '') => {
    const data = await request('/api/auth/requester-login', {
      method: 'POST',
      body: JSON.stringify({ username, full_name, sector, contact })
    });
    setToken(data.access_token);
    setUser(data.user);
    return data;
  },
  tokenLogin: async (token) => {
    const data = await request('/api/auth/token-login', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    setToken(data.access_token);
    setUser(data.user);
    return data;
  },
  createRequesterTicket: (ticketData) => request('/api/maintenance/requester-ticket', {
    method: 'POST',
    body: JSON.stringify(ticketData)
  }),
  getMyRequests: (username) => request(`/api/maintenance/?requester_name=${encodeURIComponent(username)}`),

  // Inventory
  getInventory: () => request('/api/inventory/'),
  createInventoryItem: (data) => request('/api/inventory/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  adjustStock: (id, adjustmentValue) => request(`/api/inventory/${id}/adjust-stock`, {
    method: 'POST',
    body: JSON.stringify({ adjustment_value: adjustmentValue })
  }),

  // Dashboard
  getDashboardIndicators: () => request('/api/dashboard/indicators')
};

export default api;
