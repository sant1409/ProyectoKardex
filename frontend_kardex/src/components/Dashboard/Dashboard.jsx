import { useNavigate, Outlet } from "react-router-dom";
import './Dashboard.css';
import { useState, useEffect } from 'react';
import Perfil from "../../pages/Perfil/Perfil";
import HomeDashboard from "../../components/Dashboard/HomeDashboard";
import Notificaciones from "../Notificaciones/Notificaciones";


export default function Dashboard() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [notiAbierta, setNotiAbierta] = useState(false);


   useEffect(() => {
    const verificarSesion = async () => {
      try {
        const res = await fetch("http://localhost:3000/usuarios/sesion", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();
        if (res.ok) {
          console.log("✅ Sesión activa:", data.usuario);
          setUsuario(data.usuario);  // 👈 ahora sí existe
        } else {
          console.log("⚠️ No hay sesión activa");
          navigate("/iniciar-sesion");
        }
      } catch (error) {
        console.error("Error verificando sesión:", error);
        navigate("/iniciar-sesion");
      }
    };

    verificarSesion();
  }, [navigate]);



  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/iniciar-sesion");
  };

  return (
    
    <div className="Dashboard-container"> 
      <aside className="Dashboard">
        <h2>Menú</h2>
        <ul>
          <li className="perfil-item">
            <button
              className="perfil-button"
              onClick={() => setPerfilAbierto(!perfilAbierto)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="black" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
              </svg>
              Perfil
              <span className={`flecha ${perfilAbierto ? "abierto" : ""}`}>▼</span>
            </button>
            {perfilAbierto && (
              <div className="perfil-info">
                <Perfil />
              </div>
            )}
          </li>

          <button 
            className="btn-notificaciones" 
            onClick={() => {      
              setNotiAbierta(prev => {
                console.log('toggle notiAbierta ->', !prev);
                return !prev;
              });
            }}
          >
            📩 Notificaciones
          </button>

          <li>
            <button onClick={handleLogout} className="logout-button">
              Cerrar sesión
            </button>
          </li>
        </ul>
      </aside>

      <main className="main-content">
        {/* 👇 Si no hay nada en Outlet, mostramos el HomeDashboard */}
        <Outlet />
      </main>

      {/* 📨 Contenedor flotante de notificaciones */}
      {notiAbierta && (
        <div className="notificaciones-panel">
          <button className="cerrar-panel" onClick={() => setNotiAbierta(false)}>✖</button>
          {/* Cada notificación tendrá su propio div dentro de Notificaciones */}
          <Notificaciones />
        </div>
      )}
    </div>
  );
}

