import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("auth") === "true";

  // 🔒 Si está autenticado, muestra la ruta; si no, redirige a iniciar sesión
  return isAuthenticated ? children : <Navigate to="/iniciar-sesion" />;
}

export default ProtectedRoute;
