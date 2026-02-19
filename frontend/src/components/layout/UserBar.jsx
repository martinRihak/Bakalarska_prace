import React, { useEffect, useState } from "react";
import api from "@/api/apiService";
import "@css/UserBar.css";

const UserBar = () => {
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Načtení uživatele z localStorage
    const userData = api.getCurrentUser();
    if (userData) {
      setUser(userData);
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark-mode");
    }

    // Set up timer to update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup timer on component unmount
    return () => clearInterval(timer);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  };

  if (!user) {
    return <div className="main-userBar">Loading...</div>;
  }

  return (
    <div className="main-userBar">
      <div className="theme-toggle">
        <label className="switch">
          <input
            type="checkbox"
            checked={!isDarkMode}
            onChange={toggleDarkMode}
            aria-label={
              isDarkMode
                ? "Přepnout na světlý režim"
                : "Přepnout na tmavý režim"
            }
          />
          <span className="slider-dark"></span>
        </label>
      </div>
      <div className="userName">
        <p>
          {user.username} {" | "}
          {currentTime.toLocaleString("cs-CZ", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
          {" | "}
          {currentTime.toLocaleString("cs-CZ", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
};

export default UserBar;
