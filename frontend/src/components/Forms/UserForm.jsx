import React, { useState } from 'react';
import api from '@services/apiService';

const UserForm = () => {
  // Počáteční stav formuláře
  const initialFormState = {
    username: '',
    password: '',
    email: '',
    role: 'user' // Výchozí role
  };

  // State pro data formuláře
  const [formData, setFormData] = useState(initialFormState);
  // State pro zpracování stavu (loading, success, error)
  const [status, setStatus] = useState({
    isLoading: false,
    success: false,
    error: null
  });

  // Zpracování změn v polích formuláře
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Odeslání formuláře
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ isLoading: true, success: false, error: null });

    try {
      // Odeslání dat na API
      await api.post('/users', formData);
      
      // Úspěšné vytvoření uživatele
      setStatus({ isLoading: false, success: true, error: null });
      setFormData(initialFormState); // Reset formuláře
      
      // Po 3 sekundách resetujeme úspěšnou hlášku
      setTimeout(() => {
        setStatus(prevState => ({ ...prevState, success: false }));
      }, 3000);
    } catch (error) {
      // Chyba při vytváření uživatele
      setStatus({ isLoading: false, success: false, error: error.message });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Přidat nového uživatele</h2>
      
      {status.success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Uživatel byl úspěšně vytvořen!
        </div>
      )}
      
      {status.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Chyba: {status.error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="username">
            Uživatelské jméno *
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
            Heslo *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="user">Uživatel</option>
            <option value="admin">Administrátor</option>
          </select>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={status.isLoading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              status.isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {status.isLoading ? 'Ukládám...' : 'Vytvořit uživatele'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;