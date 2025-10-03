import { useState, useEffect  } from "react";
import "./Insumos.css";

export default function InsumosListaTirillas({ tirillas = [], onActualizarTirilla = () => {},
 onEliminarTirilla = () => {},
  initialSelectedId = null,  }) {
  const [tirillaSeleccionada, setTirillaSeleccionada] = useState(null);

  // cuando cambien tirillas o initialSelectedId, buscamos y abrimos
  useEffect(() => {
    if (!initialSelectedId || !tirillas?.length) return;
    const found = tirillas.find(
      t => String(t.detalle?.id_insumo) === String(initialSelectedId)
    );
    if (found) {
      setTirillaSeleccionada(found);
      // opcional: si querés quitar el query param después de abrir, hacerlo desde el parent
    }
  }, [initialSelectedId, tirillas]);



  // 🔹 Campos que queremos mostrar en el detalle del modal
  const camposVisibles  = [
    "fecha", "temperatura", "cantidad", "salida", "saldo",
    "nombre_del_insumo", "presentacion", "laboratorio", "proveedor",
    "lote", "fecha_de_vto", "registro_invima", "expediente_invima",
    "clasificacion", "estado_de_revision", "salida_fecha",
    "inicio", "termino", "lab_sas", "factura", "costo_global",
    "costo", "costo_prueba", "costo_unidad", "iva", "consumible", 
    "categoria" 
  ];

  

function obtenerColorVencimiento(fecha_vencimiento) {
  if (!fecha_vencimiento) {
    return "white";
  }

  const hoy = new Date();
  const venc = new Date(fecha_vencimiento);

  // Calcular diferencia en meses completos
  let diffMeses = (venc.getFullYear() - hoy.getFullYear()) * 12;
  diffMeses += venc.getMonth() - hoy.getMonth();

  // Si el día de vencimiento del mes aún no llegó -> restamos 1
  if (venc.getDate() < hoy.getDate()) {
    diffMeses -= 1;
  }

  // 🔴 Vencido o hasta 3 meses
  if (diffMeses <= 3) {
    return "rgba(255, 0, 0, 0.4)";
  }
  // 🟡 Entre 4 y 5 meses
  else if (diffMeses <= 5) {
    return "rgba(255, 255, 0, 0.4)";
  }
  // 🟢 Desde el 6º mes en adelante
  else {
    return "rgba(0, 128, 0, 0.4)";
  }
}



  // Función para mostrar la fecha en formato 'YYYY-MM-DD'
const formatearFecha = (fechaISO) => {
  if (!fechaISO) return "-";
  return fechaISO.split("T")[0]; // toma solo la parte antes de la "T"
};


  return (
    <div className="tirillas-container">
      <h2>Lista de Insumos Registrados</h2>

      {tirillas.length > 0 ? (
        <div className="tirillas-grid">
          {tirillas.map((t) => {
            const hoy = new Date().toISOString().split("T")[0]; //fecha de hoy
            const fechaTermino = t.detalle?.termino
            ? t.detalle.termino.split("T")[0]
            : null;

            const estaTerminado = fechaTermino && fechaTermino <= hoy;
            
            return (
            <div
             key={t.detalle?.id_insumo || t.detalle?.lote || Math.random()} //clave unica

              className="tirilla-card"
              onClick={() => setTirillaSeleccionada(t)}
              style={{ 
                backgroundColor: obtenerColorVencimiento(
                t.detalle?.fecha_de_vto
              ), 
              position: "relative",
            }}
            >

              {/*Marquilla negra si esta terminado */}
              {estaTerminado && (
                <div 
                style= {{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  backgroundColor: "black",
                  color:"white",
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
                  {t.detalle?.nombre_del_insumo || "-"} | {t.detalle?.lote || "-"} | {t.detalle?.categoria || "-"} | {t.detalle?.mes_registro || "-"}
                </strong>
                <span>
                  {t.detalle?.presentacion || t.detalle?.laboratorio || t.detalle?.proveedor || "Registro insumo"}
                </span>
              </div>

              {/* 🔹 Botones sin interferir con el click del modal */}
              <div className="tirilla-buttons">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onActualizarTirilla(t);
                  }}
                >
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
        <p>No hay insumos registrados.</p>
      )}

      {/* 🔹 Modal de detalle */}
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
              {tirillaSeleccionada.detalle?.nombre_del_insumo || "-"} | {tirillaSeleccionada.detalle?.lote || "-"} | {tirillaSeleccionada.detalle?.categoria || "-"} | {tirillaSeleccionada.detalle?.mes_registro || "-"}
            </h3>

            <div className="tirilla-detalle">
              {Object.entries(tirillaSeleccionada.detalle || {}).map(([key, value]) => {
                if (!camposVisibles.includes(key)) return null;

                // Si la key es una de las fechas, formatearla
              const fechas = [
              "fecha", "fecha_de_vto", "salida_fecha", 
              "inicio", "termino", "fecha_recepcion", 
               "fecha_vencimiento", "fecha_salida", 
              "fecha_inicio", "fecha_terminacion"
    ];
           const displayValue = fechas.includes(key) ? formatearFecha(value) : value || "-";

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

