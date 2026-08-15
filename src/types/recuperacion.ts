export type EstadoSolicitud = "Pendiente" | "Resuelta" | "Descartada";

export interface SolicitudPassword {
    id: number;
    usuarioId: number;
    nombreCompleto: string;
    cedula: string;
    rol: string;
    catAsignado: string | null;
    // El usuario pudo desactivarse tras solicitar: restablecerle la
    // contraseña devolvería el acceso a alguien ya apartado
    usuarioActivo: boolean;
    estado: EstadoSolicitud;
    // Quién puso en marcha el restablecimiento
    origen: "Usuario" | "Administrador";
    fechaCreacion: string;
    fechaResolucion: string | null;
    resueltaPor: string | null;
}

// Llega UNA sola vez, al resolver. No se puede volver a consultar.
export interface PasswordTemporal {
    passwordTemporal: string;
    nombreCompleto: string;
    cedula: string;
}
