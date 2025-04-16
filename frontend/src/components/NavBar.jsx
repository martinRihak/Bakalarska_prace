import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../apiService';

function NavBar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  return (
    <nav style={{ 
      padding: '1rem', 
      backgroundColor: '#f8f9fa', 
      display: 'flex', 
      justifyContent: 'flex-end' 
    }}>
      <button 
        onClick={handleLogout}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Odhlásit se
      </button>
    </nav>
  );
}

export default NavBar;