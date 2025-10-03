// src/components/Dashboard/HomeDashboard.jsx
import { useNavigate } from "react-router-dom";

export default function HomeDashboard() {
  const navigate = useNavigate();

  return (
    <div className="home-dashboard">
      <h1 className="home-title">Panel Principal</h1>
      <div className="home-actions">
        <button onClick={() => navigate("/dashboard/kardex")} className="home-btn kardex-btn">
          Kardex
        </button>
        <button onClick={() => navigate("/dashboard/insumos")} className="home-btn insumos-btn">
          Insumos
        </button>
        <button onClick={() => navigate("/dashboard/inventario")} className="home-btn inventario-btn">
          Inventario
        </button>
      </div>
    </div>
  );
}
