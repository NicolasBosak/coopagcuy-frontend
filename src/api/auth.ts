import client from "./client";
import type { LoginRequest, LoginResponse } from "../types/auth";

// Identificador estable de la tablet/navegador. Permite listar y revocar
// sesiones por dispositivo. Se guarda una sola vez y persiste entre sesiones.
export function obtenerDispositivoId(): string {
    let id = localStorage.getItem("dispositivo_id");
    if (!id) {
        id = (crypto.randomUUID?.() ?? `tab-${Date.now()}`);
        localStorage.setItem("dispositivo_id", id);
    }
    return id;
}

export interface SesionActiva {
    id: number;
    usuarioId: number;
    nombreUsuario: string;
    cedula: string;
    rol: string;
    catAsignado: string | null;
    dispositivoId: string | null;
    userAgent: string | null;
    ipCreacion: string | null;
    fechaCreacion: string;
    fechaUltimoUso: string;
    fechaExpiracion: string;
    esSesionActual: boolean;
    // User-Agent ya traducido por el servidor ("Chrome · Android").
    dispositivo: string;
}

export const authApi = {
    login: async (credenciales: LoginRequest) => {
        const { data } = await client.post<LoginResponse>("/api/auth/login", {
            ...credenciales,
            dispositivoId: obtenerDispositivoId(),
        });
        return data;
    },

    // Renueva el access token con la cookie httpOnly; se usa al arrancar la app
    refresh: async () => {
        const { data } = await client.post<LoginResponse>("/api/auth/refresh");
        return data;
    },

    logout: async () => {
        try { await client.post("/api/auth/logout"); }
        catch { /* si falla la red, igual se limpia la sesión local */ }
    },

    // ── Administración de sesiones activas ────────────────────────────
    listarSesiones: async () => {
        const { data } = await client.get<SesionActiva[]>("/api/auth/sesiones");
        return data;
    },

    revocarSesion: async (id: number) => {
        await client.delete(`/api/auth/sesiones/${id}`);
    },

    revocarSesionesUsuario: async (usuarioId: number) => {
        await client.delete(`/api/auth/sesiones/usuario/${usuarioId}`);
    },
};
