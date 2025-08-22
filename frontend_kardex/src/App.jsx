import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing/Landing";
import IniciarSesion from "./pages/IniciarSesion/IniciarSesion";
import Registrar from "./pages/Registrarse/Registro";
import Dashboard from "./components/Dashboard/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Perfil from "./pages/Perfil/Perfil";


import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/iniciar-sesion" element={<IniciarSesion />} />
        <Route path="/registrarse" element={<Registrar />} />
       
         <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}>
        <Route path="perfil" element={<Perfil />} />
       
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;




