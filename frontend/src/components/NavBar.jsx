import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import api from '../apiService';
import './NavBar.css';

function NavBar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button className="menu-toggle" onClick={toggleMenu}>
        ☰
      </button>
      <nav className={`side-nav ${isOpen ? 'open' : ''}`}>
        <div className="nav-links">
          <NavLink 
            to="/" 
            end
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Domů
          </NavLink>
          <NavLink 
            to="/sensors"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Senzory
          </NavLink>
          <NavLink 
            to="/profile"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Profil
          </NavLink>
        </div>
        <button 
          onClick={handleLogout}
          className="logout-button"
        >
          Odhlásit se
        </button>
      </nav>
    </>
  );
}

export default NavBar;