import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { RolUsuario } from "../types/auth";

interface Props {
    children: React.ReactNode;
    rolesPermitidos?: RolUsuario[];
    // Pantalla utilizable SIN conexión (hoy: solo la recepción). Estando en
    // modo offline, cualquier otra ruta redirige aquí.
    disponibleOffline?: boolean;
}

export function PrivateRoute({ children, rolesPermitidos, disponibleOffline }: Props) {
    const { isAuthenticated, bootstrapping, modoOffline, auth,
        debeCambiarPassword } = useAuth();
    const location = useLocation();

    // Mientras se restaura la sesión (refresh online o "entrar directo"
    // offline) no se decide nada, para no parpadear al login por un instante
    if (bootstrapping) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-superficie">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500
                    border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Entró con una contraseña temporal: no se le deja ir a ninguna otra
    // pantalla hasta que ponga una propia. La comprobación va antes que la
    // de roles porque aplica a todos por igual.
    //
    // Se lee la ruta con useLocation y no con window.location.pathname: el
    // hook re-renderiza al navegar, la propiedad del navegador no, y con ella
    // la guarda se quedaría evaluando la ruta anterior.
    if (debeCambiarPassword && location.pathname !== "/cambiar-password") {
        return <Navigate to="/cambiar-password" replace />;
    }

    if (rolesPermitidos && auth.rol && !rolesPermitidos.includes(auth.rol)) {
        return <Navigate to="/sin-acceso" replace />;
    }

    // Sin conexión solo se permiten las pantallas de registro: el resto
    // depende de datos en vivo que no cargan offline
    if (modoOffline && !disponibleOffline) {
        return <Navigate to="/recepcion" replace />;
    }

    return <>{children}</>;
}
