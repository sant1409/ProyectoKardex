import {useState} from "react";

export default function Registro(){

    const [correo, setCorreo] = useState("");
    const [nombre, setNombre] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [mensaje, setMensaje] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        //Validaciones basicas

        if (!correo || !nombre || !contraseña) {
            setMensaje("Todos los campos son obligatorios");
            return
        }

        if (contraseña.length < 6) {
            setMensaje("La contraseña debe tener al menos 6 caracters");
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/usuarios/registrarse", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({correo, nombre, contraseña}),
            });

            const data = await res.json();
            if (res. ok) {
                setMensaje("Usuario registrado correctamente");
                //Limpiar el formulario 
                setCorreo("");
                setNombre("");
                setContraseña("");
            }else {
                setMensaje(data.error || "Error al registarse usuario");

            }

        } catch (error) {
            console.error  (error);
            setMensaje("Error de conexion con el servidor");
        }
    };

    return (
        <div>
            <h2>Registro de usuario</h2>
            {mensaje && <p>{mensaje}</p>}
            <form onSubmit = {handleSubmit}>
                <input 
                type= "email"
                placeholder = "Correo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                />

                <input 
                type="text"
                placeholder="Nombre"
                value = {nombre}
                onChange = {(e) => setNombre(e.target.value)}
                />
                <input 
                type= "password"
                placeholder="Contraseña"
                value= {contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                />
                <button type= "submit">Registrarse</button>
                </form>
        </div>
    );

    }
