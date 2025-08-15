import { useState } from "react";

export default function Login() {
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [mensaje, setMensaje] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!correo || !contraseña) {
            setMensaje("Todos los campos son obligatorios");
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/usuarios/iniciar_sesion", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ correo, contraseña }),
            });

            const data = await res.json();
            if (res.ok) {
                setMensaje("Inicio de sesión exitoso");
                setCorreo("");
                setContraseña("");
            } else {
                setMensaje(data.error || data.mensaje || "Error al iniciar sesión");
            }
        } catch (error) {
            console.error(error);
            setMensaje("Error de conexión con el servidor");
        }
    };

    return (
        <div>
            <h2>Iniciar Sesión</h2>
            {mensaje && <p>{mensaje}</p>}
            <form onSubmit={handleSubmit}>
                <input 
                    type="email"
                    placeholder="Correo"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                />
                <input 
                    type="password"
                    placeholder="Contraseña"
                    value={contraseña}
                    onChange={(e) => setContraseña(e.target.value)}
                />
                <button type="submit">Iniciar Sesión</button>
            </form>
        </div>
    );
}
