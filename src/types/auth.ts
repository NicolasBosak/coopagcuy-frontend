export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    nombreCompleto: string;
    email: string;
    rol: string;
    // CAT asignado: un Operador de CAT solo registra en su centro
    catAsignado: string | null;
    expira: string;
}

export type RolUsuario =
    | "OperadorCAT"
    | "OperadorFaenamiento"
    | "AdminCooperativa"
    | "AdminTecnico";