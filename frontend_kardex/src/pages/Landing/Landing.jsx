import { useState } from "react";
import RegistroForm from "../../components/Registrarse/RegistroForm";
import IniciarSesionForm from "../../components/IniciarSesion/IniciarSesionForm";


import "./Landing.css";

export default function Landing() {
    const [mostrar, setMostrar] = useState("");

    return (
        <div className="landing-container">
            <div className="landing-card">
                <h2>Bienvenido</h2>
                <button onClick={() => setMostrar("registro")}>Registrarse</button>
                <button onClick={() => setMostrar("login")}>Iniciar Sesión</button>
                

                {mostrar === "registro" && <RegistroForm />}
                {mostrar === "login" && <IniciarSesionForm />}
               
            </div>
        </div>
    );
}
