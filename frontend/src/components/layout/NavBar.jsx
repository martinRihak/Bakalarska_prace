import React, { useState,useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import api from "@/api/apiService";
import "@css/NavBar.css";
import "@css/buttons.css";
function NavBar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Načíst roli ze serveru, ne z localStorage
  useEffect(() => {
    let cancelled = false;
    api
      .checkAuthStatus()
      .then((data) => {
        if (!cancelled && data?.status === "authenticated") {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button className="menu-toggle" onClick={toggleMenu}>
        ☰
      </button>
      <nav className={`side-nav ${isOpen ? "open" : ""}`}>
        <div className="nav-links">
          <NavLink
            to="/"
            end
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Domů
          </NavLink>
          <NavLink
            to="/sensors"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Senzory
          </NavLink>
          <NavLink
            to="/weather"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
           Předpověď
          </NavLink>
          <NavLink
            to="/data-export"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            Data Export{" "}
          </NavLink>
          <NavLink
            to="/data-import"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            Data Import{" "}
          </NavLink>
          {userRole === "admin" && (
            <NavLink
              to="/users"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              Uživatelé
            </NavLink>
          )}
        </div>
        <button onClick={handleLogout} className="logout-button">
          Odhlásit se
        </button>
      </nav>
    </>
  );
}

export default NavBar;