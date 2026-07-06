import {
    createContext, useContext, useState,
    type ReactNode
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LoginResponse, RolUsuario } from "../types/auth";

interface AuthState {
    token: string | null;
    nombreCompleto: string | null;
    cedula: string | null;
    rol: RolUsuario | null;
    catAsignado: string | null;
}

interface AuthContextType {
    auth: AuthState;
    login: (data: LoginResponse) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    // El caché de datos vive en memoria de la pestaña: al cambiar de
    // sesión hay que vaciarlo o el siguiente usuario vería datos del
    // anterior (las tablets de los CAT son compartidas)
    const queryClient = useQueryClient();

    const [auth, setAuth] = useState<AuthState>(() => {
        // Restaurar sesión al recargar la página
        const saved = sessionStorage.getItem("jwt_user");
        if (saved) {
            try { return JSON.parse(saved); }
            catch {
                return {
                    token: null, nombreCompleto: null, cedula: null,
                    rol: null, catAsignado: null,
                };
            }
        }
        return {
            token: null, nombreCompleto: null, cedula: null,
            rol: null, catAsignado: null,
        };
    });

    const login = (data: LoginResponse) => {
        const state: AuthState = {
            token: data.token,
            nombreCompleto: data.nombreCompleto,
            cedula: data.cedula,
            rol: data.rol as RolUsuario,
            catAsignado: data.catAsignado ?? null,
        };
        queryClient.clear();
        sessionStorage.setItem("jwt_token", data.token);
        sessionStorage.setItem("jwt_user", JSON.stringify(state));
        setAuth(state);
    };

    const logout = () => {
        sessionStorage.removeItem("jwt_token");
        sessionStorage.removeItem("jwt_user");
        queryClient.clear();
        setAuth({
            token: null, nombreCompleto: null, cedula: null,
            rol: null, catAsignado: null,
        });
    };

    return (
        <AuthContext.Provider value={{
            auth,
            login,
            logout,
            isAuthenticated: !!auth.token
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return ctx;
}