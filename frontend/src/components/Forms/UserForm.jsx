import React, { useState } from 'react';
import api from '@services/apiService';
import '@css/forms.css';

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
    <div className="form-container">
      <h2 className="form-heading">Přidat nového uživatele</h2>
      
      {status.success && (
        <div className="form-success">
          Uživatel byl úspěšně vytvořen!
        </div>
      )}
      
      {status.error && (
        <div className="form-error">
          Chyba: {status.error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="username">
            Uživatelské jméno *
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Heslo *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-select"
          >
            <option value="user">Uživatel</option>
            <option value="admin">Administrátor</option>
          </select>
        </div>
        
        <div className="form-footer">
          <button
            type="submit"
            disabled={status.isLoading}
            className="form-submit"
          >
            {status.isLoading ? 'Ukládám...' : 'Vytvořit uživatele'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;