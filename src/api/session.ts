import type { RolUsuario } from "../types/auth";

// Identidad NO secreta de la sesión. Se guarda en localStorage para permitir
// "entrar directo" sin conexión (renderizar el nombre/rol/CAT y habilitar el
// registro offline). No contiene ningún token: el access token vive en
// memoria y el refresh token en una cookie httpOnly.
export interface Identidad {
    nombreCompleto: string;
    cedula: string;
    rol: RolUsuario;
    catAsignado: string | null;
    // Fin de la sesión de 7 días (expiración del refresh token). Pasada esta
    // fecha, ni siquiera offline se permite "entrar directo".
    sesionExpira: string; // ISO
}

const CLAVE = "coopagcuy_identidad";

export const session = {
    leer(): Identidad | null {
        const raw = localStorage.getItem(CLAVE);
        if (!raw) return null;
        try { return JSON.parse(raw) as Identidad; }
        catch { return null; }
    },

    guardar(identidad: Identidad) {
        localStorage.setItem(CLAVE, JSON.stringify(identidad));
    },

    limpiar() {
        localStorage.removeItem(CLAVE);
    },

    // La sesión offline sigue vigente si no ha pasado su fecha de expiración
    vigente(identidad: Identidad | null): boolean {
        if (!identidad) return false;
        const expira = Date.parse(identidad.sesionExpira);
        return Number.isFinite(expira) && Date.now() < expira;
    },
};
