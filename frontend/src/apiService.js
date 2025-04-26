// apiService.js
const API_BASE_URL = "http://localhost:5000";

const apiRequest = async (endpoint, method = "GET", data = null) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    credentials: "include",
    mode: "cors",
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Neautorizovaný přístup");
    }

    if (endpoint === '/sensors/export_data') {
      const contentType = response.headers.get('Content-Type');
      if (contentType.includes('application/json') || contentType.includes('text/csv')) {
        return await response.text();
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Chyba při zpracování požadavku");
    }

    return data;
  } catch (error) {
    console.error('Api request error', error);
    throw error;
  }
};

const api = {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, data) => apiRequest(endpoint, "POST", data),
  put: (endpoint, data) => apiRequest(endpoint, "PUT", data),
  patch: (endpoint, data) => apiRequest(endpoint, "PATCH", data),
  delete: (endpoint) => apiRequest(endpoint, "DELETE"),

  login: async (username, password) => {
    const response = await apiRequest("/auth/login", "POST", {
      username,
      password,
    });
    if (response.token) {
      localStorage.setItem("token", response.token);
    }
    return response;
  },

  register: (username, email, password) => {
    return apiRequest("/auth/register", "POST", { username, email, password });
  },

  logout: () => {
    localStorage.removeItem("token");
    return apiRequest("/auth/logout", "POST");
  },

  checkAuthStatus: () => {
    return apiRequest("/auth/status");
  },

  getSensorHistory: (sensorId, timeRange) => {
    return apiRequest(`/sensors/getSensorHistory/${sensorId}?timeRange=${timeRange}`);
  },
  
  getLatestSensorData: (sensorId) => {
    return apiRequest(`/sensors/getLatestSensorData/${sensorId}`, "GET");
  },
  
  getDashboards: async () => {
    return apiRequest("/dashboard/userDashBoards", "GET");
  },
  getDashboardWidgets: async () => {
    return apiRequest("/dashboard/widgets", "GET");
  },

  createDashboard: async (dashboardData) => {
    return apiRequest("/dashboard/create", "POST", dashboardData);
  },
  getUserSensors: async () => {
    return apiRequest("/sensors/getSensors", "GET");
  },

  createWidget: async (widgetData) => {
    return apiRequest("/dashboard/widget", "POST", widgetData);
  },

  exportSensorData: async (exportData) => {
    return apiRequest("/sensors/export_data", "POST", exportData);
  },
};

export default api;