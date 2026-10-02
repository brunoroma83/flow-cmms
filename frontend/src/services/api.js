const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

export const getToken = () => localStorage.getItem('flow_cmms_token');
export const setToken = (token) => localStorage.setItem('flow_cmms_token', token);
export const removeToken = () => localStorage.removeItem('flow_cmms_token');

export const getUser = () => {
  const user = localStorage.getItem('flow_cmms_user');
  return user ? JSON.parse(user) : null;
};
export const setUser = (user) => localStorage.setItem('flow_cmms_user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('flow_cmms_user');

async function request(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    removeUser();
    if (window.location.pathname !== '/login') {
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
  }

  if (!response.ok) {
    let errorMessage = `Erro HTTP: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
        }
      }
    } catch (e) {
      // Ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// API methods
export const api = {
  // Auth
  login: async (username, password) => {
    const data = await request('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.access_token);
    
    // Fetch profile
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

  logout: () => {
    removeToken();
    removeUser();
  },

  // Equipment / Assets
  getEquipment: () => request('/api/equipment/'),
  getEquipmentById: (id) => request(`/api/equipment/${id}`),
  createEquipment: (data) => request('/api/equipment/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteEquipment: (id) => request(`/api/equipment/${id}`, {
    method: 'DELETE',
  }),
  getMaintenanceHistory: (equipmentId) => request(`/api/reports/maintenance-history/${equipmentId}`),

  // Maintenance
  getMaintenance: (params = '') => request(`/api/maintenance/${params}`),
  getMaintenanceById: (id) => request(`/api/maintenance/${id}`),
  createMaintenance: (data) => request('/api/maintenance/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateMaintenance: (id, data) => request(`/api/maintenance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  addMaintenanceEntry: (maintenanceId, entryData) => request(`/api/maintenance/${maintenanceId}/entries`, {
    method: 'POST',
    body: JSON.stringify(entryData),
  }),
  getMaintenanceEntries: (maintenanceId) => request(`/api/maintenance/${maintenanceId}/entries`),

  // Inventory
  getInventory: () => request('/api/inventory/'),
  createInventoryItem: (data) => request('/api/inventory/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  adjustStock: (id, adjustmentValue) => request(`/api/inventory/${id}/adjust-stock`, {
    method: 'POST',
    body: JSON.stringify({ adjustment_value: adjustmentValue }),
  }),

  // Dashboard
  getDashboardIndicators: () => request('/api/dashboard/indicators'),
};

export default api;
