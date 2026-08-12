import { useContext } from "react";
import { AuthContext } from "./AuthContextInstance";

// Separado de AuthContext.tsx: ese archivo solo debe exportar el componente
// AuthProvider, si no Fast Refresh no puede tratarlo como un módulo de
// componente puro (react-refresh/only-export-components).
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return ctx;
}
