import React from "react"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Komponenty
import NavBar from "@components/NavBar";
import ProtectedRoute from "@components/ProtectedRoute";
import SensorGraph from "@components/SensorGraph";
import SensorDashboard from '@components/testDashboard';

// Stránky
import Home from "@pages/Home";
import Login from "./Login/Login";

// Formuláře
import UserForm from '@forms/UserForm';

// Styly
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-container">
        <NavBar />
        <div className="main-content">
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
              path="/sensors/:sensorId"
              element={
                <ProtectedRoute>
                  <SensorGraph/>
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
              path="/insertUser"
              element={
                <UserForm/>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
