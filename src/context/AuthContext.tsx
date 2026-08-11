import {
    useState, useEffect,
    type ReactNode
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "../api/tokenStore";
import { session, type Identidad } from "../api/session";
import { authApi } from "../api/auth";
import type { LoginResponse, RolUsuario } from "../types/auth";
import { AuthContext } from "./AuthContextInstance";

interface AuthState {
    nombreCompleto: string | null;
    cedula: string | null;
    rol: RolUsuario | null;
    catAsignado: string | null;
}

export interface AuthContextType {
    auth: AuthState;
    // true mientras se intenta restaurar la sesión al arrancar (refresh o
    // "entrar directo" offline); PrivateRoute espera a que termine
    bootstrapping: boolean;
    isAuthenticated: boolean;
    // La sesión se restauró SIN conexión: el access token no está disponible,
    // solo se permiten los registros offline
    modoOffline: boolean;
    login: (data: LoginResponse) => void;
    logout: () => void;
}

const VACIO: AuthState = {
    nombreCompleto: null, cedula: null, rol: null, catAsignado: null,
};

function aEstado(id: Identidad): AuthState {
    return {
        nombreCompleto: id.nombreCompleto,
        cedula: id.cedula,
        rol: id.rol,
        catAsignado: id.catAsignado,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    // El caché de datos vive en memoria de la pestaña: al cambiar de sesión
    // hay que vaciarlo o el siguiente usuario vería datos del anterior (las
    // tablets de los CAT son compartidas)
    const queryClient = useQueryClient();

    const [auth, setAuth] = useState<AuthState>(VACIO);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [modoOffline, setModoOffline] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(true);

    // Restaurar la sesión al abrir la app
    useEffect(() => {
        let cancelado = false;

        (async () => {
            const identidad = session.leer();

            // Con conexión: renovar contra el servidor (rota el refresh token
            // y trae un access token fresco). Es la vía normal.
            if (navigator.onLine) {
                try {
                    const data = await authApi.refresh();
                    if (cancelado) return;
                    aplicarLogin(data, false);
                    return;
                } catch {
                    // El refresh falló (expiró, revocada o sin sesión previa)
                    if (cancelado) return;
                    if (!identidad) { finalizar(VACIO, false, false); return; }
                    // Hay identidad pero el server la rechazó → sesión inválida
                    session.limpiar();
                    finalizar(VACIO, false, false);
                    return;
                }
            }

            // Sin conexión: "entrar directo" si la sesión de 7 días sigue
            // vigente. No hay access token (ni hace falta: los registros van
            // a IndexedDB), solo se habilita el modo offline.
            if (session.vigente(identidad) && identidad) {
                finalizar(aEstado(identidad), true, true);
            } else {
                finalizar(VACIO, false, false);
            }
        })();

        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function finalizar(estado: AuthState, autenticado: boolean, offline: boolean) {
        setAuth(estado);
        setIsAuthenticated(autenticado);
        setModoOffline(offline);
        setBootstrapping(false);
    }

    function aplicarLogin(data: LoginResponse, limpiarCache: boolean) {
        const identidad: Identidad = {
            nombreCompleto: data.nombreCompleto,
            cedula: data.cedula,
            rol: data.rol as RolUsuario,
            catAsignado: data.catAsignado ?? null,
            sesionExpira: data.sesionExpira,
        };
        tokenStore.set(data.token);
        session.guardar(identidad);
        if (limpiarCache) queryClient.clear();
        finalizar(aEstado(identidad), true, false);
    }

    const login = (data: LoginResponse) => aplicarLogin(data, true);

    const logout = () => {
        authApi.logout();          // revoca el refresh token en el servidor
        tokenStore.clear();
        session.limpiar();
        queryClient.clear();
        setAuth(VACIO);
        setIsAuthenticated(false);
        setModoOffline(false);
    };

    return (
        <AuthContext.Provider value={{
            auth, bootstrapping, isAuthenticated, modoOffline, login, logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
