// Flow CMMS - API Service Client (Vanilla JS)
const API_BASE_URL = window.location.origin;

export const getToken = () => localStorage.getItem('flow_cmms_token');
export const setToken = (token) => localStorage.setItem('flow_cmms_token', token);
export const removeToken = () => localStorage.removeItem('flow_cmms_token');

export const getUser = () => {
  const u = localStorage.getItem('flow_cmms_user');
  return u ? JSON.parse(u) : null;
};
export const setUser = (user) => localStorage.setItem('flow_cmms_user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('flow_cmms_user');

async function request(endpoint, options = {}) {
  const token = getToken();
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

export const api = {
  // Auth
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
  logout: () => {
    removeToken();
    removeUser();
    window.location.hash = '#login';
  },

  // Equipment Assets
  getEquipment: (params = '') => request(`/api/equipment/${params}`),
  getEquipmentById: (id) => request(`/api/equipment/${id}`),
  createEquipment: (data) => request('/api/equipment/', {
    method: 'POST',
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
  getMaintenanceEntries: (maintenanceId) => request(`/api/maintenance/${maintenanceId}/entries`),

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
