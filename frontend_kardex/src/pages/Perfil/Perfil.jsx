// En Perfil.jsx
import { useEffect, useState } from "react";

export default function Perfil() {
  const [usuario, setUsuario] = useState({nombre: '', correo: ''});

  useEffect(() => {
    const info = JSON.parse(localStorage.getItem('user'));
    if(info){
      setUsuario(info);
    }
  }, []);

  return (
    <div>
      <h2>Perfil</h2>
      <p>Nombre: {usuario.nombre}</p>
      <p>Correo: {usuario.correo}</p>
    </div>
  );
}

