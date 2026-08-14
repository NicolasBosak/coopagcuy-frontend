export interface LoginRequest {
    cedula: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    nombreCompleto: string;
    cedula: string;
    rol: string;
    // CAT asignado: un Operador de CAT solo registra en su centro
    catAsignado: string | null;
    // Expiración del access token (corto)
    expira: string;
    // Fin de la sesión de 7 días (refresh token): hasta cuándo se permite
    // "entrar directo" sin conexión
    sesionExpira: string;
    // Se activó tras un restablecimiento: hay que cambiar la contraseña antes
    // de poder usar el resto de la aplicación
    debeCambiarPassword: boolean;
}

export type RolUsuario =
    | "OperadorCAT"
    | "OperadorFaenamiento"
    | "AdminCooperativa"
    | "AdminTecnico";
