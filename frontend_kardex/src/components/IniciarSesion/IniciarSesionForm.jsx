import {useState} from "react";
import './IniciarSesionForm.css';
import { useNavigate } from "react-router-dom";


export default function Login() {
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [paso, setPaso] = useState("iniciar_sesion");
    const [codigo, setCodigo] = useState("")
    const [nuevaContraseña, setNuevaContraseña] = useState("");
    const navigate = useNavigate();

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

                // guarda el token que se envia al backend
                localStorage.setItem("token", data.token);

                  localStorage.setItem("auth", "true");


                if (data.usuario) {
                    localStorage.setItem("user", JSON.stringify(data.usuario));
                    console.log("DEBUG: usuario guardado", data.usuario);
                }

                //redirige al dashboard
                navigate("/dashboard");

                //limpiar los campos
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


  const handleSubmitRecuperarClave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:3000/usuarios/resetear_clave", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({codigo, nuevaContraseña})
                });

    
      const data = await res.json();
      if (res.ok) {
        setMensaje("Contraseña modificada correctamente");
        setPaso("iniciar_sesion");
      } else {
        setMensaje(data.error || "Código incorrecto");
      }
    } catch (error) {
      console.error(error);
      setMensaje("Error de conexión con el servidor");
    }
  };



      const handleSubmitCorreo  = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:3000/usuarios/recuperar_clave", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({correo})
                });

    
      const data = await res.json();
      if (res.ok) {
        setMensaje("El correo se envió correctamente");
        setPaso("codigo");
      } else {
        setMensaje(data.error || "Correo incorrecto");
      }
    } catch (error) {
      console.error(error);
      setMensaje("Error de conexión con el servidor");
    }
  };


  const handleSubmitCodigo = async (e) => {
    e.preventDefault();
    try {
        const res = await fetch("http://localhost:3000/usuarios/verificar_codigo", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({correo, codigo}),

        });
        const data = await res.json();
        if (res.ok) {
            setMensaje("Código de verificacion, ahora escribe tu contraseña");
            setPaso("nuevaclave");
        }else {
            setMensaje(data.error || "Código incorrecto");
        }

    } catch (error) {
        console.error(error);
        setMensaje("Error de conexión con el servidor");
    }
    
  };
    
    

    return (
        <div>
            {mensaje && <p>{mensaje}</p>}
            {paso === "iniciar_sesion" && (
                <div className="iniciarsesion-container">
            <form className="iniciarsesion-form" onSubmit={handleSubmit}>
                <h2>Iniciar Sesión</h2>
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

                <p
                style={{color: "blue", cursor: "pointer"}}
                onClick={() => setPaso("correo")}

                >
                    ¿Olvidaste tu contraseña? 
                </p>

                <button type="submit">Iniciar Sesión</button>
            </form>
            </div>
            )}

            {paso === "correo" && (
                <div className="iniciarsesion-container">
                <form className="iniciarsesion-form" onSubmit= {handleSubmitCorreo}>
                    <h2>Recuperar contraseña</h2>
                    <input
                    type="email"
                    placeholder="Escribe tu correo"
                    value= {correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    />
                    <button type= "submit">Enviar código</button>
                </form>
                </div>
            )}

            {paso === "codigo" && (
                <div className="iniciarsesion-container">
                <form className="iniciarsesion-form" onSubmit={handleSubmitCodigo}>
                    <h2>Verificar código</h2>
                    <input
                    type="text"
                    placeholder="Codigo enviado a tu correo "
                    value= {codigo}
                    onChange={(e) => setCodigo(e.target.value)} 
                    />
                    <button type="submit">Verificar</button>
                </form>
                </div>
            )}

            {paso === "nuevaclave" && (
                <div className="iniciarsesion-container">
                <form className="iniciarsesion-form" onSubmit={handleSubmitRecuperarClave}>
                    <h2>Nueva contraseña</h2>
                    <input 
                    type="password"
                    placeholder="Escrie tu nueva contraseña"
                    value={nuevaContraseña}
                    onChange={(e) => setNuevaContraseña(e.target.value)}
                    />
                    <button type="submit">Cambiar contraseña</button>
                </form>
                </div>
            )}
        </div>
            

        );
    }