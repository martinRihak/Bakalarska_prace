// apiService.js
const API_BASE_URL = import.meta.env.VITE_API_URL;
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

    // Kontrola nového access tokenu v hlavičce
    const newToken = response.headers.get("New-Access-Token");
    if (newToken) {
      localStorage.setItem("token", newToken);
    }

    if (!response.ok && response.status >= 500) {
      return { data: null, error: "server-error" };
    }

    if (response.status === 401 && !endpoint.includes("/auth/refresh-token")) {
      try {
        const refreshResponse = await fetch(
          `${API_BASE_URL}/auth/refresh-token`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem("token", refreshData.token);

          // Opakování původního požadavku s novým tokenem
          const newResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${refreshData.token}`,
            },
          });

          if (newResponse.ok) {
            return await newResponse.json();
          }
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
      }

      // Pokud refresh selhal, odhlásíme uživatele
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Neautorizovaný přístup");
    }

    if (endpoint === "/sensors/export_data") {
      const contentType = response.headers.get("Content-Type");

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.message || errorData.error || "Chyba při exportu dat";
        throw new Error(errorMessage);
      }

      if (
        contentType &&
        (contentType.includes("application/json") ||
          contentType.includes("text/csv"))
      ) {
        return await response.text();
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Chyba při zpracování požadavku");
    }

    return data;
  } catch (error) {
    console.error("Api request error", error);

    // Pokud je chyba typu NetworkError nebo TypeError (nemůžeme se připojit k serveru)
    if (error instanceof TypeError || error.name === "NetworkError") {
      throw new Error("Server není dostupný");
    }

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
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  register: (username, email, password) => {
    return apiRequest("/auth/register", "POST", { username, email, password });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return apiRequest("/auth/logout", "POST");
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  checkAuthStatus: () => {
    return apiRequest("/auth/status");
  },

  getSensorHistory: (sensorId, timeRange, widget_id) => {
    return apiRequest(
      `/sensors/getSensorHistory/${sensorId}?timeRange=${timeRange}&widget_id=${widget_id}`,
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
  getWeatherForecast: (latitude, longitude, locationName = "") =>
    apiRequest(
      `/weather?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&locationName=${encodeURIComponent(locationName)}`,
      "GET",
    ),
  getUser: async () => {
    return apiRequest("/auth/user", "GET");
  },
  getAllUsers: () => apiRequest("/users", "GET"),
  getUserById: (userId) => apiRequest(`/users/${userId}`, "GET"),
  createUser: (userData) => apiRequest("/users", "POST", userData),
  updateUser: (userId, userData) => apiRequest(`/users/${userId}`, "PATCH", userData),
  deleteUser: (userId) => apiRequest(`/users/${userId}`, "DELETE"),
  getSensorsForUser: (userId) => apiRequest(`/users/${userId}/sensors`, "GET"),
  updateSensorForUser: (userId, sensorId, sensorData) =>
    apiRequest(`/users/${userId}/sensors/${sensorId}`, "PATCH", sensorData),
  getAvailableSensors: () => apiRequest("/sensors/available"),
  addSensorToUser: (sensorId) =>
    apiRequest("/sensors/add-to-user", "POST", { sensorId }),
  createSensor: (sensorData) =>
    apiRequest("/sensors/create", "POST", sensorData),
  updateSensor: (sensorId, sensorData) =>
    apiRequest(`/sensors/${sensorId}`, "PATCH", sensorData),
  toggleSensorActive: (sensorId, isActive) =>
    apiRequest(`/sensors/${sensorId}/toggle-active`, "PATCH", { isActive }),

  // Widgets API
  deleteWidget: (dashboardId, widgetId) =>
    apiRequest(`/widget/delete/${dashboardId}/${widgetId}`, "DELETE"),

  // Nové funkce
  deleteDashboard: (dashboardId) =>
    apiRequest(`/dashboard/dashboard/${dashboardId}`, "DELETE"),
  saveWidgetPositions: (dashboardId, widgetPositions) =>
    apiRequest(`/dashboard/dashboard/${dashboardId}/save_positions`, "POST", {
      widgetPositions,
    }),
};

export default api;
