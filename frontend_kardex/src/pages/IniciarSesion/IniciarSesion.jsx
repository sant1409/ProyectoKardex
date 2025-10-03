import IniciarSesionForm from "../../components/IniciarSesion/IniciarSesionForm.jsx";
import AuthLayout from "../../layouts/AuthLayout";



export default function IniciarSesionPage() {
    return (
        <div className="iniciarsesion-page">
           <AuthLayout>
      <IniciarSesionForm />
    </AuthLayout>
        </div>
    );
}