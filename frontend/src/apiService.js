// apiService.js
const API_BASE_URL = 'http://localhost:5000';
const apiRequest = async (endpoint, method = 'GET', data = null) => {
    const token = localStorage.getItem('authToken');
    console.log(token);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
      method,
      headers,
      credentials: 'include', // Pro předávání cookies
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          throw new Error('Neautorizovaný přístup');
        }
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Chyba při zpracování požadavku');
        }
        
        return data;
      } catch (error) {
        console.error('API Request Error:', error);
        throw error; // Předat chybu volajícímu
      }
  };
  
  const api = {
    get: (endpoint) => apiRequest(endpoint),
    post: (endpoint, data) => apiRequest(endpoint, 'POST', data),
    put: (endpoint, data) => apiRequest(endpoint, 'PUT', data),
    patch: (endpoint, data) => apiRequest(endpoint, 'PATCH', data),
    delete: (endpoint) => apiRequest(endpoint, 'DELETE'),
    
    // Auth specifické metody
    login: (username, password) => {
      return apiRequest('/auth/login', 'POST', { username, password });
    },
    
    register: (username, email, password) => {
      return apiRequest('/auth/register', 'POST', { username, email, password });
    },
    
    logout: () => {
      localStorage.removeItem('authToken');
      return Promise.resolve({ status: 'success', message: 'Odhlášení proběhlo úspěšně' });
    },
    
    checkAuthStatus: () => {
      return apiRequest('/auth/status');
    }
  };
  
  export default api;