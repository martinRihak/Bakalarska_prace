import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

// Komponenty
import NavBar from "@/components/layout/NavBar";
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import ServerConnectionError from "@/components/common/ServerConnectionError";

// Stránky
import Home from "@/pages/Home";
import DataExport from "@/pages/DataExport";
import SensorsPage from "@/pages/SensorsPage";
import UserPage from "@/pages/UserPage";
import WeatherPage from "@/pages/WeatherPage";
import Login from "@/features/auth/Login/Login";

// Formuláře
import UserForm from "@/components/forms/UserForm";
import DashboardForm from "@/components/forms/DashboardForm";
// Styly
import "./App.css";

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
  const hideNavBarPaths = ["/login", "/server-error"]; // Přidáno server-error do cest bez NavBaru

  const shouldShowNavBar = !hideNavBarPaths.includes(location.pathname);

  return (
    <div className="app-container">
      {shouldShowNavBar && <NavBar /> }
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/server-error" element={<ServerConnectionError />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-dashboard"
          element={
            <ProtectedRoute>
              <DashboardForm />
            </ProtectedRoute>
          }
        />
        <Route path="/insertUser" element={<UserForm />} />
        <Route
          path="/data-export"
          element={
            <ProtectedRoute>
              <DataExport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sensors"
          element={
            <ProtectedRoute>
              <SensorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UserPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/weather"
          element={
            <ProtectedRoute>
              <WeatherPage/>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
