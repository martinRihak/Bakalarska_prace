import React from "react"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from "./Login/Login";
import SensorGraph from "./components/SensorGraph";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";


function App() {
  return(
    <Router>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/sensor/:sensorId" element={<SensorGraph/>}/>
        <Route path="/" element={<div><h1>Domovska stranka</h1></div>}/>
      </Routes>
    </Router>
  )
}

export default App
