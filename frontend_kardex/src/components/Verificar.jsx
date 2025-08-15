import {useState} from "react";

export default function Varificar() {
    const [correo, setCorreo] = useState("");
    const [codigo, setCodigo] = useState("");
    const [mensaje, setMensaje] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch("http://localhost:3000/usuarios/verificar", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({correo, codigo}),
        });

        
        console.log("status:", res.status); // 👈 para ver el código de respuesta
        const data = await res.json();
        console.log("data:", data);

        
        setMensaje(data.message || data.error);
    };
    return (
        <div>
            <h2>Verificar cuenta</h2>
            {mensaje && <p>{mensaje}</p>}
            <form onSubmit={handleSubmit}>
                <input type="email" placeholder="correo" value={correo} onChange={(e)=> setCorreo(e.target.value)}/> 
                <input type="text" placeholder="Código" value= {codigo} onChange={(e) => setCodigo(e.target.value)} />
                 <button type ="submit">Verificar</button>       
                  </form>
        </div>
    );
}