import { useState } from "react";
import './RegistroForm.css'

export default function Registro() {

  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [paso, setPaso] = useState("registro"); // controla registro o verificación
  const [codigo, setCodigo] = useState(""); // código de verificación

  const handleSubmitRegistro = async (e) => {
    e.preventDefault();

    if (!correo || !nombre || !contraseña) {
      setMensaje("Todos los campos son obligatorios");
      return;
    }

    if (contraseña.length < 6) {
      setMensaje("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/usuarios/registrarse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, nombre, contraseña }),
      });

      const data = await res.json();
      if (res.ok) {
        setMensaje("Usuario registrado correctamente, revisa tu correo para verificar");
        setPaso("verificar"); // pasamos al paso de verificación
      } else {
        setMensaje(data.error || "Error al registrarse");
      }
    } catch (error) {
      console.error(error);
      setMensaje("Error de conexión con el servidor");
    }
  };

  const handleSubmitVerificacion = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3000/usuarios/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, codigo}),
      });

      const data = await res.json();
      if (res.ok) {
        setMensaje("Cuenta verificada correctamente");
        setPaso("verificado");
      } else {
        setMensaje(data.error || "Código incorrecto");
      }
    } catch (error) {
      console.error(error);
      setMensaje("Error de conexión con el servidor");
    }
  };

  return (
    <div>
      <h2>
        {paso === "registro" && "Registro de usuario"}
        {paso === "verificar" && "Verificar correo"}
        {paso === "verificado" && "¡Registro completo!"}
      </h2>

        <div className="registrase-container">

      {mensaje && <p className="mensaje">{mensaje}</p>}

      {paso === "registro" && (
        <form className="registro-form" onSubmit={handleSubmitRegistro}>
          <input
            type="email"
            placeholder="Correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
          />
          <button type="submit">Registrarse</button>
        </form>
        
        
      )}
      </div>

      {paso === "verificar" && (
          <div className="registrase-container">
        <form className="registro-form" onSubmit={handleSubmitVerificacion}>
          <input
            type="text"
            placeholder="Código de verificación"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <button type="submit">Verificar</button>
        </form>
        </div>
      )}
    </div>
  );
}
