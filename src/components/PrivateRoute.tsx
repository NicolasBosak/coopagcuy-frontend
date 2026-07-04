import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { RolUsuario } from "../types/auth";

interface Props {
    children: React.ReactNode;
    rolesPermitidos?: RolUsuario[];
}

export function PrivateRoute({ children, rolesPermitidos }: Props) {
    const { isAuthenticated, auth } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (rolesPermitidos && auth.rol && !rolesPermitidos.includes(auth.rol)) {
        return <Navigate to="/sin-acceso" replace />;
    }

    return <>{children}</>;
}