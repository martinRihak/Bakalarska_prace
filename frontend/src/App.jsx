import Reactfrom from "react"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from "./Login/Login";
function App() {
  return(
    <Router>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/" element={<div><h1>Domovska stranka</h1></div>}/>
      </Routes>
    </Router>
  )
}

export default App
