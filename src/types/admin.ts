// Tipos del módulo de administración: usuarios, catálogos y devoluciones

export interface Usuario {
    id: number;
    nombreCompleto: string;
    // Número de cédula: única credencial de inicio de sesión
    cedula: string;
    // Correo de contacto opcional; no sirve para iniciar sesión
    email: string | null;
    rol: string;
    // CAT asignado (solo Operadores de CAT)
    catAsignado: string | null;
    activo: boolean;
    fechaCreacion: string;
}

export interface CrearUsuarioRequest {
    nombreCompleto: string;
    cedula: string;
    email?: string;
    password: string;
    rol: string;
    catAsignado?: string;
}

export interface ActualizarUsuarioRequest {
    nombreCompleto: string;
    email?: string;
    rol: string;
    catAsignado?: string;
    nuevaPassword?: string;
}

export const ROLES: { value: string; label: string }[] = [
    { value: "OperadorCAT", label: "Operador de CAT" },
    { value: "OperadorFaenamiento", label: "Operador de faenamiento" },
    { value: "AdminCooperativa", label: "Administrador de cooperativa" },
    { value: "AdminTecnico", label: "Administrador técnico" },
];

export interface Comunidad {
    id: number;
    nombre: string;
    canton: string;
    catReferencia: string;
    activa: boolean;
}

export interface GuardarComunidadRequest {
    nombre: string;
    canton: string;
    catReferencia: string;
}

export interface Devolucion {
    id: number;
    loteId: number | null;
    // Código del lote faenado del despacho; en devoluciones antiguas
    // solo existe el código de jaula
    codigoLoteFaenado: string | null;
    codigoLote: string | null;
    numeroSesion: number | null;
    nombreProductora: string;
    comunidad: string;
    clienteDevuelve: string;
    fechaDevolucion: string;
    cantidadUnidades: number;
    motivo: string;
    responsable: string;
    observaciones: string | null;
}

// La devolución nace de un despacho: el cliente se deriva de él
export interface RegistrarDevolucionRequest {
    despachoId: number;
    fechaDevolucion: string;
    cantidadUnidades: number;
    motivo: string;
    responsable: string;
    observaciones?: string;
}

export interface ProductoraCambio {
    id: number;
    campoModificado: string;
    valorAnterior: string | null;
    valorNuevo: string | null;
    modificadoPor: string;
    fechaCambio: string;
}
