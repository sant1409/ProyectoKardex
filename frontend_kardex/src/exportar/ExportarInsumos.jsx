import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportarInsumos(tirillas, categoriaSeleccionada, mesSeleccionado) {
      console.log("🚀 Entró a exportarInsumos");
  const filtradas = tirillas.filter(t => {
    const d = t.detalle || {};
    const mesRegistro = String(d.mes_registro || "").trim();
    if (!mesRegistro) return false;

    const parts = mesRegistro.split("-");
    if (parts.length < 2) return false;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;

    const fecha = new Date(year, monthIndex, 1);
    const mesNombre = fecha.toLocaleString("es-ES", { month: "long" });

    return (
      d.categoria === categoriaSeleccionada &&
      mesNombre.toLowerCase() === String(mesSeleccionado || "").toLowerCase()
    );
  });
  console.log("🔍 Filtradas:", filtradas);

  const camposVisibles = [
     "fecha", "temperatura", "cantidad", "salida", "saldo",
    "nombre_del_insumo", "presentacion", "laboratorio", "proveedor",
    "lote", "fecha_de_vto", "registro_invima", "expediente_invima",
    "clasificacion", "estado_de_revision", "salida_fecha",
    "inicio", "termino", "lab_sas", "factura", "costo_global",
    "costo", "costo_prueba", "costo_unidad", "iva", "consumible", 
    "categoria" 
  ];

  const camposFecha = [
    "fecha", "fecha_de_vto", "salida_fecha", "inicio", "termino"
  ];

  const datosExportar = filtradas.map(t => {
    const detalle = t.detalle || {};
    const fila = {};

    camposVisibles.forEach(campo => {
      let valor = detalle[campo] ?? "-";

      if (valor && camposFecha.includes(campo) && !isNaN(new Date(valor))) {
        const fecha = new Date(valor);
        valor = fecha.toISOString().split("T")[0];
      }

      fila[campo.replaceAll("_", " ")] = valor;
    });

    return fila;
  });

  const hoja = XLSX.utils.json_to_sheet(datosExportar);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, `Insumos_${categoriaSeleccionada}_${mesSeleccionado}`);

  const buffer = XLSX.write(libro, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `insumos_${categoriaSeleccionada}_${mesSeleccionado}.xlsx`);
}
