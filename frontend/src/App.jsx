import React from "react"
import { BrowserRouter as Router, Routes, Route, useLocation,RouterProvider,createBrowserRouter } from 'react-router-dom';

// Komponenty
import NavBar from "@components/NavBar";
import ProtectedRoute from "@components/ProtectedRoute";
import SensorDashboard from '@components/Dashboard';


// Stránky
import Home from "@pages/Home";
import Login from "./Login/Login";

// Formuláře
import UserForm from '@forms/UserForm';
import DashBoardForm from '@forms/DashBoardForm';
// Styly
import './App.css'

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}



// Vytvoření nové komponenty pro obsah, abychom mohli použít useLocation
function AppContent() {
  const location = useLocation();
  const hideNavBarPaths = ['/login']; // Zde můžete přidat další cesty, kde chcete skrýt NavBar

  const shouldShowNavBar = !hideNavBarPaths.includes(location.pathname);

  return (
    <div className="app-container">
      {shouldShowNavBar && <NavBar />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div>Profile Page</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-dashboard"
            element={
              <ProtectedRoute>
                <DashBoardForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insertUser"
            element={
              <UserForm/>
            }
          />
        </Routes>
      </div>
  );
}

export default App;
