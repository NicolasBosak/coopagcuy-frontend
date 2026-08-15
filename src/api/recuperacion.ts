import client from "./client";
import type { PasswordTemporal, SolicitudPassword } from "../types/recuperacion";

export const recuperacionApi = {
    // Anónimo. Responde siempre lo mismo exista o no el usuario: es el
    // servidor quien decide, aquí no hay nada que interpretar.
    solicitar: async (cedula: string) => {
        const { data } = await client.post<{ mensaje: string }>(
            "/api/auth/recuperacion", { cedula });
        return data.mensaje;
    },

    listar: async (incluirResueltas = false) => {
        const { data } = await client.get<SolicitudPassword[]>(
            "/api/auth/recuperacion",
            { params: incluirResueltas ? { incluirResueltas: true } : undefined });
        return data;
    },

    resolver: async (id: number) => {
        const { data } = await client.post<PasswordTemporal>(
            `/api/auth/recuperacion/${id}/resolver`);
        return data;
    },

    descartar: async (id: number) => {
        await client.post(`/api/auth/recuperacion/${id}/descartar`);
    },

    // Restablecimiento por iniciativa del administrador, sin solicitud previa
    restablecerPorUsuario: async (usuarioId: number) => {
        const { data } = await client.post<PasswordTemporal>(
            `/api/auth/recuperacion/usuario/${usuarioId}`);
        return data;
    },

    cambiarPassword: async (passwordActual: string, passwordNueva: string) => {
        await client.post("/api/auth/cambiar-password",
            { passwordActual, passwordNueva });
    },
};
