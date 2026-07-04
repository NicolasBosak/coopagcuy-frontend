import {
    createContext, useContext, useState,
    type ReactNode
} from "react";
import type { LoginResponse, RolUsuario } from "../types/auth";

interface AuthState {
    token: string | null;
    nombreCompleto: string | null;
    email: string | null;
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
    const [auth, setAuth] = useState<AuthState>(() => {
        // Restaurar sesión al recargar la página
        const saved = sessionStorage.getItem("jwt_user");
        if (saved) {
            try { return JSON.parse(saved); }
            catch {
                return {
                    token: null, nombreCompleto: null, email: null,
                    rol: null, catAsignado: null,
                };
            }
        }
        return {
            token: null, nombreCompleto: null, email: null,
            rol: null, catAsignado: null,
        };
    });

    const login = (data: LoginResponse) => {
        const state: AuthState = {
            token: data.token,
            nombreCompleto: data.nombreCompleto,
            email: data.email,
            rol: data.rol as RolUsuario,
            catAsignado: data.catAsignado ?? null,
        };
        sessionStorage.setItem("jwt_token", data.token);
        sessionStorage.setItem("jwt_user", JSON.stringify(state));
        setAuth(state);
    };

    const logout = () => {
        sessionStorage.removeItem("jwt_token");
        sessionStorage.removeItem("jwt_user");
        setAuth({
            token: null, nombreCompleto: null, email: null,
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