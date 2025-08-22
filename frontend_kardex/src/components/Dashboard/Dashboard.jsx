import { useNavigate, Link, Outlet } from "react-router-dom";
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/iniciar-sesion");
  };

  return (
    <div className="Dashboard-container">
      <aside className="Dashboard">
        <h2>Menú</h2>
        <ul>
          <li>
            <Link to="perfil"> 
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="black" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
              </svg>
              Perfil
            </Link>
          </li>
          <li>
            <button onClick={handleLogout} className="logout-button">
              Cerrar sesión
            </button>
          </li>
        </ul>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
