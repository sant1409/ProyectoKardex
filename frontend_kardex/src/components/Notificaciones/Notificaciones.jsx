import { useState, useEffect } from "react";

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotificaciones = async () => {
    try {
      const res = await fetch("http://localhost:3000/notificaciones");
      const data = await res.json();
      setNotificaciones(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
      setLoading(false);
    }
  };

  const marcarLeida = async (id) => {
    try {
      await fetch(`http://localhost:3000/notificaciones/${id}/leida`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      setNotificaciones((prev) =>
        prev.filter((n) => n.id_notificacion !== id)
      );
    } catch (err) {
      console.error("Error al marcar notificación:", err);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
  }, []);

  if (loading) return <p>Cargando notificaciones...</p>;

  return (
    <div className="notificaciones-container">
      <h2>Bandeja de Notificaciones</h2>
      {notificaciones.length === 0 && <p>No hay notificaciones.</p>}
      <ul>
        {notificaciones.map((n) => (
          <li key={n.id_notificacion} className="notificacion-item">
            <p><strong>Tipo:</strong> {n.tipo}</p>
           <p><strong>Mensaje:</strong> {n.mensaje}</p>
            <p>
              <small>
                Fecha: {n.fecha_evento ? new Date(n.fecha_evento).toLocaleDateString() : "Sin fecha"}
              </small>
            </p>
            {!n.leido && (
              <button className="marcar-leida" onClick={() => marcarLeida(n.id_notificacion)}>
                Marcar como leída
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
