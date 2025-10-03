

import { useState, useEffect  } from "react";
import "./Kardex.css";

export default function KardexListaTirillas({ tirillas = [], 
  onActualizarTirilla = () => {}, 
  onEliminarTirilla = () => {},
  initialSelectedId = null, }) {
  const [tirillaSeleccionada, setTirillaSeleccionada] = useState(null);

   useEffect(() => {
    if (!initialSelectedId || !tirillas?.length) return;
    const found = tirillas.find(
      t => String(t.detalle?.id_kardex) === String(initialSelectedId)
    );
    if (found) setTirillaSeleccionada(found);
  }, [initialSelectedId, tirillas]);

  // 🔹 Campos que queremos mostrar en el detalle del modal
  const camposVisibles = [
    "fecha_recepcion", "temperatura_llegada", "maximo", "minimo", "cantidad",
    "salida", "saldo", "nombre_insumo", "presentacion", "casa_comercial",
    "proveedor", "lote", "fecha_vencimiento", "registro_invima", "expediente_invima",
    "estado_revision", "temperatura_almacenamiento", "clasificacion_riesgo",
    "principio_activo", "forma_farmaceutica", "concentracion", "unidad_medida",
    "fecha_salida", "fecha_inicio", "fecha_terminacion", "area", "factura",
    "costo_general", "costo_caja", "costo_prueba", "iva", "consumible"

  ];



function obtenerColorVencimiento(fecha_vencimiento) {
  if (!fecha_vencimiento) return "white"; // sin fecha -> blanco

  const hoy = new Date();
  const venc = new Date(fecha_vencimiento);

  // Calcular diferencia en meses exactos
  let diffMeses = (venc.getFullYear() - hoy.getFullYear()) * 12;
  diffMeses += venc.getMonth() - hoy.getMonth();

  // Si todavía no llegó el día dentro de ese mes, restamos 1
  if (venc.getDate() < hoy.getDate()) {
    diffMeses -= 1;
  }

  if (diffMeses <= 3) {
    return "rgba(255, 0, 0, 0.4)"; // vencido o hasta 3 meses -> rojo
  } else if (diffMeses <= 5) {
    return "rgba(255, 255, 0, 0.4)"; // 4 y 5 meses -> amarillo
  } else {
    return "rgba(0, 128, 0, 0.4)"; // desde el 6º mes en adelante -> verde
  }
}



  // Función para mostrar la fecha en formato 'YYYY-MM-DD'
const formatearFecha = (fechaISO) => {
  if (!fechaISO) return "-";
  return fechaISO.split("T")[0]; // toma solo la parte antes de la "T"
};
return (
  <div className="tirillas-container">
    <h2>Lista de Kardex Registrados</h2>

    {tirillas.length > 0 ? (
      <div className="tirillas-grid">
        {tirillas.map((t) => {
          // 🔹 Aquí sí puedes usar lógica normal
          const hoy = new Date().toISOString().split("T")[0]; // fecha de hoy
          const fechaTerminacion = t.detalle?.fecha_terminacion
            ? t.detalle.fecha_terminacion.split("T")[0]
            : null;

          const estaTerminado = fechaTerminacion && fechaTerminacion <= hoy;

          return (
            <div
              key={t.detalle?.id_kardex || t.detalle?.lote || Math.random()} // 🔹 clave única
              className="tirilla-card"
              onClick={() => setTirillaSeleccionada(t)}
              style={{
                backgroundColor: obtenerColorVencimiento(
                  t.detalle?.fecha_vencimiento
                ),
                position: "relative",
              }}
            >
              {/* 🔹 Marquilla negra si está terminado */}
              {estaTerminado && (
                <div
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    backgroundColor: "black",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  Terminado
                </div>
              )}

              <div className="tirilla-header">
                <strong>
                  {t.detalle?.nombre_insumo || "-"} |{" "}
                  {t.detalle?.lote || "-"} | {t.detalle?.lab_sas || "-"} |{" "}
                  {t.detalle?.mes_registro || "-"}
                </strong>
                <span>
                  {t.detalle?.presentacion ||
                    t.detalle?.casa_comercial ||
                    t.detalle?.proveedor ||
                    "Registro kardex"}
                </span>
              </div>

              {/* 🔹 Botones sin interferir con el click del modal */}
              <div className="tirilla-buttons">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // evita que se abra el modal
                    onActualizarTirilla(t);
                  }}
                >
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // evita que se abra el modal
                    onEliminarTirilla(t);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p>No hay tirillas registradas.</p>
    )}

    {tirillaSeleccionada && (
      <div className="tirilla-modal">
        <div className="tirilla-modal-content">
          <button
            className="tirilla-close"
            onClick={() => setTirillaSeleccionada(null)}
          >
            X
          </button>

          <h3>
            {tirillaSeleccionada.detalle?.nombre_insumo || "-"} |{" "}
            {tirillaSeleccionada.detalle?.lote || "-"} |{" "}
            {tirillaSeleccionada.detalle?.lab_sas || "-"} |{" "}
            {tirillaSeleccionada.detalle?.mes_registro || "-"}
          </h3>

          <div className="tirilla-detalle">
            {Object.entries(tirillaSeleccionada.detalle || {}).map(
              ([key, value]) => {
                if (!camposVisibles.includes(key)) return null;

                const fechas = [
                  "fecha_recepcion",
                  "fecha_vencimiento",
                  "fecha_salida",
                  "fecha_inicio",
                  "fecha_terminacion",
                ];

                const displayValue = fechas.includes(key)
                  ? formatearFecha(value)
                  : value || "-";

                return (
                  <p key={key}>
                    <strong>{key.replaceAll("_", " ")}:</strong> {displayValue}
                  </p>
                );
              }
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
  }