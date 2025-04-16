import React from "react"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from "./Login/Login";
import SensorGraph from "./components/SensorGraph";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import './App.css'

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Counter from "./components/Couonter";

// Layout wrapper for protected routes
const ProtectedLayout = ({ children }) => (
  <div>
    <NavBar />
    {children}
  </div>
);

function App() {
  return(
    <Router>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route 
          path="/sensor/:sensorId" 
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <SensorGraph/>
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <div><h1>Domovska stranka</h1></div>
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/counter"
          element={
            <Counter/>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
