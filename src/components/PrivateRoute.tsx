import { Navigate } from "react-router-dom";
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
    const { isAuthenticated, bootstrapping, modoOffline, auth } = useAuth();

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
