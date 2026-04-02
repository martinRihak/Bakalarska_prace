// apiService.js
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Timeout pro fetch požadavky (důležité pro Raspberry Pi)
const REQUEST_TIMEOUT = 15000; // 15 sekund

const fetchWithTimeout = (url, options, timeout = REQUEST_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
};

const apiRequest = async (
  endpoint,
  method = "GET",
  data = null,
  options = {},
) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers,
    credentials: "include",
    mode: "cors",
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    fetchOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      fetchOptions,
    );

    // Kontrola nového access tokenu v hlavičce
    const newToken = response.headers.get("New-Access-Token");
    if (newToken) {
      localStorage.setItem("token", newToken);
    }

    // --- KONZISTENTNÍ error handling: vždy throw ---
    if (!response.ok && response.status >= 500) {
      throw new Error("server-error");
    }

    if (response.status === 401 && !endpoint.includes("/auth/refresh-token")) {
      // Pokus o refresh tokenu
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Opakování původního požadavku s novým tokenem
        const retryHeaders = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };
        const retryResponse = await fetchWithTimeout(
          `${API_BASE_URL}${endpoint}`,
          { ...fetchOptions, headers: retryHeaders }
        );
        if (retryResponse.ok) {
          return await retryResponse.json();
        }
      }

      // Pokud refresh selhal, odhlásíme uživatele i na backendu (session/cookies),
      // aby frontend a backend neměly rozdílný auth stav.
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (logoutError) {
        console.error(
          "Backend logout after refresh failure failed:",
          logoutError,
        );
      }

      // Lokální cleanup
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Neautorizovaný přístup");
    }

    // --- Specializovaný response parsing přes options ---
    if (options.responseType === "text") {
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Chyba při zpracování",
        );
      }
      return await response.text();
    }

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || "Chyba při zpracování požadavku");
    }

    return responseData;
  } catch (error) {
    // Timeout
    if (error.name === "AbortError") {
      throw new Error("Server není dostupný");
    }
    // Síťová chyba
    if (error instanceof TypeError || error.name === "NetworkError") {
      throw new Error("Server není dostupný");
    }
    throw error;
  }
};

// Extrahovaná refresh logika
const tryRefreshToken = async () => {
  try {
    const refreshResponse = await fetchWithTimeout(
      `${API_BASE_URL}/auth/refresh-token`,
      { method: "POST", credentials: "include" },
    );
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      localStorage.setItem("token", refreshData.token);
      return true;
    }
  } catch {
    // Refresh selhal
  }
  return false;
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
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  register: (username, email, password) => {
    return apiRequest("/auth/register", "POST", { username, email, password });
  },

  logout: async () => {
    try {
      await apiRequest("/auth/logout", "POST");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  checkAuthStatus: () => {
    return apiRequest("/auth/status");
  },

  // Senzory
  getSensorHistory: (sensorId, timeRange, widget_id) => {
    return apiRequest(
      `/sensors/getSensorHistory/${sensorId}?timeRange=${timeRange}`,
    );
  },
  getLatestSensorData: (sensorId) => {
    return apiRequest(`/sensors/getLatestSensorData/${sensorId}`, "GET");
  },

  getDashboards: async () => {
    return apiRequest("/dashboard/userDashBoards", "GET");
  },
  getDashboardWidgets: async (dashboardId) => {
    return apiRequest(`/dashboard/widgets/${dashboardId}`, "GET");
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
  searchWeatherLocations: async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedQuery)}&count=8&language=cz&format=json`,
    );

    if (!response.ok) {
      throw new Error("Nepodařilo se načíst návrhy lokalit.");
    }

    const data = await response.json();
    return data.results || [];
  },
  getWeatherForecast: ({ latitude, longitude, locationName = "", timeRange = "7d" }) =>
    apiRequest(
      `/weather?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&locationName=${encodeURIComponent(locationName)}&timeRange=${encodeURIComponent(timeRange)}`,
      "GET",
    ),
  getAvailableSensors: () => apiRequest("/sensors/available"),
  deleteUserSensor: (sensorId) =>
    apiRequest(`/sensors/delete/${sensorId}`, "DELETE"),
  addSensorToUser: (sensorId) =>
    apiRequest("/sensors/add-to-user", "POST", { sensorId }),
  createSensor: (sensorData) =>
    apiRequest("/sensors/create", "POST", sensorData),
  updateSensor: (sensorData) =>
    apiRequest(`/sensors/${sensorData.sensor_id}`, "PATCH", sensorData),
  toggleSensorActive: (sensorId, isActive) =>
    apiRequest(`/sensors/${sensorId}/toggle-active`, "PATCH", { isActive }),

  importSensorData: (importData) =>
    apiRequest("/sensors/import_data", "PATCH", importData),

  // Export — BEZ hardcoded detekce uvnitř apiRequest
  exportSensorData: (exportData) => {
    return apiRequest("/sensors/export_data", "POST", exportData, {
      responseType: "text",
    });
  },

  // Dashboardy
  getDashboards: () => apiRequest("/dashboard/userDashBoards", "GET"),
  getDashboardWidgets: (dashboardId) =>
    apiRequest(`/dashboard/widgets/${dashboardId}`, "GET"),
  createDashboard: (dashboardData) =>
    apiRequest("/dashboard/create", "POST", dashboardData),
  createWidget: (widgetData) =>
    apiRequest("/dashboard/widget", "POST", widgetData),
  deleteDashboard: (dashboardId) =>
    apiRequest(`/dashboard/dashboard/${dashboardId}`, "DELETE"),
  saveWidgetPositions: (dashboardId, widgetPositions) =>
    apiRequest(`/dashboard/dashboard/${dashboardId}/save_positions`, "POST", {
      widgetPositions,
    }),

  // Widgety
  deleteWidget: (dashboardId, widgetId) =>
    apiRequest(`/widget/delete/${dashboardId}/${widgetId}`, "DELETE"),

  // Uživatelé
  getUser: () => apiRequest("/auth/user", "GET"),
  getAllUsers: () => apiRequest("/users", "GET"),
  getUserById: (userId) => apiRequest(`/users/${userId}`, "GET"),
  createUser: (userData) => apiRequest("/users", "POST", userData),
  updateUser: (userId, userData) =>
    apiRequest(`/users/${userId}`, "PATCH", userData),
  deleteUser: (userId) => apiRequest(`/users/${userId}`, "DELETE"),
  getSensorsForUser: (userId) => apiRequest(`/users/${userId}/sensors`, "GET"),
  updateSensorForUser: (userId, sensorId, sensorData) =>
    apiRequest(`/users/${userId}/sensors/${sensorId}`, "PATCH", sensorData),
};

export default api;
