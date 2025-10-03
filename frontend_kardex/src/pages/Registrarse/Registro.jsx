
import RegistroForm from "../../components/Registrarse/RegistroForm";
import AuthLayout from "../../layouts/AuthLayout";

export  default  function RegistroPage() {
    return (
          <div className="registro-page"> 
           <AuthLayout>
          <RegistroForm />
          </AuthLayout>
          </div>

    );
}