// apiService.js
const API_BASE_URL = "http://localhost:5000";

const apiRequest = async (endpoint, method = "GET", data = null) => {
  const token = localStorage.getItem("token"); // Changed from authToken to token
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
    credentials: "include", // Pro předávání cookies
    mode: "cors", // Explicitně nastavíme CORS mode
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      localStorage.removeItem("token"); // Changed from authToken to token
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Neautorizovaný přístup");
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Chyba při zpracování požadavku");
    }

    return data;
  } catch (error) {
    
    console.error('Api request error',error);
    throw error;
  }
};

const api = {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, data) => apiRequest(endpoint, "POST", data),
  put: (endpoint, data) => apiRequest(endpoint, "PUT", data),
  patch: (endpoint, data) => apiRequest(endpoint, "PATCH", data),
  delete: (endpoint) => apiRequest(endpoint, "DELETE"),

  // Auth specifické metody
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

  getSensorHistory: (sensorId) => {
    return apiRequest(`/sensors/getSensorHistory/${sensorId}`);
  },

  getDashboardWidgets: async () => {
    return apiRequest("/dashboard/widgets", "GET");
  },

  createDashboard: async (dashboardData) => {
    return apiRequest("/dashboard/create", "POST", dashboardData);
  },
};

export default api;
