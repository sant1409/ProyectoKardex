import { useState } from "react";
import Registro from "../components/Registro";
import IniciarSesion from "../components/IniciarSesion";

import "./Landing.css";

export default function Landing() {
    const [mostrar, setMostrar] = useState("");

    return (
        <div className="landing-container">
            <div className="landing-card">
                <h2>Bienvenido</h2>
                <button onClick={() => setMostrar("registro")}>Registrarse</button>
                <button onClick={() => setMostrar("login")}>Iniciar Sesión</button>

                {mostrar === "registro" && <Registro />}
                {mostrar === "login" && <IniciarSesion />}
            </div>
        </div>
    );
}
