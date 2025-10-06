import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Inventario.css";




export default function Inventario() {
  const [inventario, setInventario] = useState([]);
  const [tirillaSeleccionada, setTirillaSeleccionada] = useState(null);
  const [filtros, setFiltros] = useState({
    tipo: "",
    nombre: "",
    mes: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async (filtrosQuery) => {
    try {
      const params = new URLSearchParams(filtrosQuery || {}).toString();
      const res = await fetch(`http://localhost:3000/inventario${params ? "?" + params : ""}`)
      const data = await res.json();
      // Asegurarse de que sea un array
    const inventarioData = Array.isArray(data) ? data : [];
    setInventario(inventarioData);
  } catch (error) {
    console.error("Error cargando inventario:", error);
    setInventario([]);
  }
};

const obtenerColorVencimiento = (tipo, fechaVenc) => {
  // ⚪ Si no hay fecha -> sin color
  if (!fechaVenc) return "white";

  const hoy = new Date();
  const venc = new Date(fechaVenc);

  // Calcular diferencia en meses exactos
  let diffMeses = (venc.getFullYear() - hoy.getFullYear()) * 12;
  diffMeses += venc.getMonth() - hoy.getMonth();

  // Si aún no llega el día del mes, restamos 1
  if (venc.getDate() < hoy.getDate()) {
    diffMeses -= 1;
  }

  // 🔴 Vencido o hasta 3 meses
  if (diffMeses <= 3) return "rgba(255, 0, 0, 0.3)";
  // 🟡 Entre 4 y 5 meses
  if (diffMeses <= 5) return "rgba(255, 255, 0, 0.3)";
  // 🟢 Desde el 6º mes en adelante
  return "rgba(0, 128, 0, 0.3)";
};



  // Función para formatear fecha tipo ISO (2025-09-07T05:00:00.000Z) → 2025-09-07
    const formatearFecha = (fechaISO) => {
  if (!fechaISO) return "";
  return fechaISO.split("T")[0]; // toma solo la parte antes de la "T"
};


  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const aplicarFiltros = () => {
    cargarInventario(filtros);
  };

  // 🔹 Esta es la clave: función para el botón de volver
  const handleVolver = () => {
    navigate(-1);
  };
  
return (
  <div className="inventario-container">
    <h2>Inventario</h2>

    {/* Contenedor de botón y filtros */}
    <div className="botones-top">
      {/* 🔹 Botón de volver */}
      <button className="btn-volver" onClick={handleVolver}>
        ← Volver
      </button>

       {/* 🔹 Botón para ir a StockInventario */}
    <button
    className="btn-stock"
    onClick={() => navigate("/dashboard/stockinventario")}
    >
     Stock Inventario
    </button>

      {/* Filtros */}
      <div className="inventario-filtros">
        <select name="tipo" value={filtros.tipo} onChange={handleFiltroChange}>
          <option value="">Todos</option>
          <option value="INSUMO">Insumo</option>
          <option value="REACTIVO">Reactivo</option>
        </select>
        <input
          type="text"
          name="nombre"
          placeholder="Buscar por nombre"
          value={filtros.nombre}
          onChange={handleFiltroChange}
        />
        <input
          type="number"
          name="mes"
          placeholder="Mes"
          value={filtros.mes}
          onChange={handleFiltroChange}
        />
        <button onClick={aplicarFiltros}>Filtrar</button>
      </div>
    </div>



      {/* Listado */}
      <div className="inventario-grid">
        <h3>Insumos</h3>
        {inventario
          .filter((item) => item.tipo === "INSUMO")
          .map((i, index) => (
            <div
                 key={`INSUMO-${i.id_insumo}-${index}`}
              className="inventario-card"

              style={{
        backgroundColor: obtenerColorVencimiento(i.tipo, i.fecha_de_vto)
      }}
              
               onClick={() => navigate(`/dashboard/insumos/${i.id}`)} // Redirige al detalle del insumo
            >
              <strong>{i.nombre}</strong>
             <span>Fecha de recepcion: {formatearFecha (i.fecha)}</span>

            </div>
          ))}

        <h3>Reactivos</h3>
        {inventario
          .filter((item) => item.tipo === "REACTIVO")
          .map((i, index) => (
            <div
              key={`REACTIVO-${i.id_kardex}-${index}`}
              className="inventario-card"
             style={{
        backgroundColor: obtenerColorVencimiento(i.tipo, i.fecha_vencimiento)
      }}
              onClick={() => navigate(`/dashboard/kardex/${i.id}`)} // Redirige al detalle del reactivo
            >
              <strong>{i.nombre}</strong>
              <span>Fecha de recepción: {formatearFecha(i.fecha_recepcion)}</span>
            </div>
          ))}
      </div>

      {/* Modal de detalle */}
      {tirillaSeleccionada && (
        <div className="tirilla-modal">
          <div className="tirilla-modal-content">
            <button className="tirilla-close" onClick={() => setTirillaSeleccionada(null)}>
              X
            </button>
            <h3>{tirillaSeleccionada.nombre}</h3>
            <p>Tipo: {tirillaSeleccionada.tipo}</p>
            <p>
              Fecha:{" "}
              {tirillaSeleccionada.tipo === "INSUMO"
                ? tirillaSeleccionada.fecha
                : tirillaSeleccionada.fecha_recepcion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
