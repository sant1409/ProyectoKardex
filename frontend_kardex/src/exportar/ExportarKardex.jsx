import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportarKardex(tirillas, lab_sasSeleccionado, mesSeleccionado) {
const filtradas = tirillas.filter(t => {
  const d = t.detalle || {};
  const mesRegistro = String(d.mes_registro || "").trim(); // ej. "2025-03"
  if (!mesRegistro) return false;

  const parts = mesRegistro.split("-");
  if (parts.length < 2) return false;
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1; // 0-based

  // crear fecha a partir de year/month evitando parseo por string
  const fecha = new Date(year, monthIndex, 1); // local-safe
  const mesNombre = fecha.toLocaleString('es-ES', { month: 'long' });

  console.log("Registro:", mesRegistro, "→", mesNombre); // para debugging

  return (
    d.lab_sas === lab_sasSeleccionado &&
    mesNombre.toLowerCase() === String(mesSeleccionado || "").toLowerCase()
  );
});

  // 2️⃣ Campos visibles
  const camposVisibles = [
    "fecha_recepcion", "temperatura_llegada", "maximo", "minimo", "cantidad",
    "salida", "saldo", "nombre_insumo", "presentacion", "casa_comercial",
    "proveedor", "lote", "fecha_vencimiento", "registro_invima", "expediente_invima",
    "estado_revision", "temperatura_almacenamiento", "clasificacion_riesgo",
    "principio_activo", "forma_farmaceutica", "concentracion", "unidad_medida",
    "fecha_salida", "fecha_inicio", "fecha_terminacion", "area", "factura",
    "costo_general", "costo_caja", "costo_prueba", "iva", "consumible"
  ];
  // 3️⃣ Transformar para Excel
  const datosExportar = filtradas.map(t => {
    const detalle = t.detalle || {};
    const fila = {};
    camposVisibles.forEach(campo => {
    let valor = detalle[campo] ?? "-";

         const camposFecha = [
      "fecha_recepcion",
      "fecha_vencimiento",
      "fecha_salida",
      "fecha_inicio",
      "fecha_terminacion"
    ];

    if (
      valor && 
      camposFecha.includes(campo) &&
      !isNaN(new Date(valor))
    ) {
      const fecha = new Date(valor);
      valor = fecha.toISOString().split("T")[0]; // YYYY-MM-DD
    }
      fila[campo.replaceAll("_", " ")] = valor;
    });
     
    return fila;
  });

  // 4️⃣ Crear archivo Excel
  const hoja = XLSX.utils.json_to_sheet(datosExportar);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, `Kardex_${lab_sasSeleccionado}_${mesSeleccionado}`);

  const buffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `kardex_${lab_sasSeleccionado}_${mesSeleccionado}.xlsx`);
}
