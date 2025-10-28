//EN esta parte se puede observar los botones principales, kardex, insumos, inventario
// src/components/Dashboard/HomeDashboard.jsx
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function HomeDashboard() {
  const navigate = useNavigate();

  return (
    <div className="home-dashboard">
      <div className="home-content">
        <div className="image-wrapper">
          {/* Imagen del laboratorio */}
          <img
            src="/slider/panel principal.png"
            alt="Laboratorio Clínico Silvio Alfonso Marín Uribe"
            className="home-image"
          />

          {/* Botones pegados debajo del texto en la imagen */}
          <div className="home-actions-overlay">
            <button
            onClick={() => navigate("/dashboard/kardex")}
            className="home-btn kardex-btn"
             >
                  <img src="https://www.pngfind.com/pngs/m/69-697004_png-file-svg-icono-de-laboratorio-png-transparent.png"
                alt="Kardex Icon" width="24" height="24" style={{ marginRight: "8px" }}
          />
            Kardex
          </button>

            <button
              onClick={() => navigate("/dashboard/insumos")}
              className="home-btn insumos-btn"
            >  
            <img src="https://static.vecteezy.com/system/resources/previews/032/041/947/non_2x/clinical-analysis-result-icon-lab-blood-test-medicine-report-medical-check-up-health-check-png.png"
                alt="Kardex Icon" width="24" height="24" style={{ marginRight: "8px" }}
              />
             
              Insumos
            </button>
            <button
              onClick={() => navigate("/dashboard/inventario")}
              className="home-btn inventario-btn"
            >
              <img src="https://tse4.mm.bing.net/th/id/OIP.ngWVJN0P6rafIjyHts9xCAHaIn?pid=ImgDet&w=206&h=239&c=7&dpr=1,6&o=7&rm=3"
              alt="Kardex Icon" width="24" height="24" style={{ marginRight: "8px" }}
                />
              Inventario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
