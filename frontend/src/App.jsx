import React from "react"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from "./Login/Login";
import SensorGraph from "./components/SensorGraph";

function App() {
  return(
    <Router>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/getSensoreHistory/:sensorId" element={<SensorGraph/>}/>
        <Route path="/" element={<div><h1>Domovska stranka</h1></div>}/>
      </Routes>
    </Router>
  )
}

export default App
