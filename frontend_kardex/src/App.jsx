import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing/Landing";
import IniciarSesion from "./pages/IniciarSesion/IniciarSesion";
import Registrar from "./pages/Registrarse/Registro";

import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/iniciar-sesion" element={<IniciarSesion />} />
        <Route path="/registrarse" element={<Registrar />} />
      </Routes>
    </Router>
  );
}

export default App;
