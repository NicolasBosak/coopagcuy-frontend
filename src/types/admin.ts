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
    rol: string;
    catAsignado?: string;
}

export interface ActualizarUsuarioRequest {
    nombreCompleto: string;
    email?: string;
    rol: string;
    catAsignado?: string;
}

// Respuesta del alta: la contraseña temporal viaja UNA sola vez y no se puede
// volver a consultar.
export interface UsuarioCreado {
    usuario: Usuario;
    passwordTemporal: string;
}

export const ROLES: { value: string; label: string }[] = [
    { value: "OperadorCAT", label: "Operador de CAT" },
    { value: "OperadorFaenamiento", label: "Operador de faenamiento" },
    { value: "AdminCooperativa", label: "Administrador de cooperativa" },
    { value: "AdminTecnico", label: "Administrador técnico" },
];

export interface Provincia {
    id: number;
    nombre: string;
    activa: boolean;
    // Cantones activos que cuelgan de ella: explica por qué una baja falló
    totalCantones: number;
}

export interface GuardarProvinciaRequest {
    nombre: string;
}

export interface Canton {
    id: number;
    nombre: string;
    provinciaId: number;
    // Nombre resuelto de la provincia (solo lectura)
    provincia: string;
    activo: boolean;
    totalComunidades: number;
}

export interface GuardarCantonRequest {
    nombre: string;
    provinciaId: number;
}

// El código de tres letras es la clave, no un id numérico: prefija el
// identificador de cada jaula (PAT-20260615-001) y por eso es inmutable.
export interface CentroAcopio {
    codigo: string;
    nombre: string;
    cantonId: number;
    canton: string;
    provincia: string;
    activo: boolean;
}

export interface CrearCentroAcopioRequest {
    codigo: string;
    nombre: string;
    cantonId: number;
}

// Sin código: es inmutable, y el contrato del API tampoco lo acepta.
export interface ActualizarCentroAcopioRequest {
    nombre: string;
    cantonId: number;
}

export interface Comunidad {
    id: number;
    nombre: string;
    cantonId: number;
    // Cantón y provincia resueltos desde el catálogo (solo lectura)
    canton: string;
    provincia: string;
    catReferencia: string;
    activa: boolean;
    // Ubicación en el mapa público; null en comunidades dadas de alta
    // desde Administración a las que nadie les puso coordenadas todavía
    latitud: number | null;
    longitud: number | null;
    altitudMinM: number | null;
    altitudMaxM: number | null;
}

export interface GuardarComunidadRequest {
    nombre: string;
    cantonId: number;
    catReferencia: string;
    latitud?: number | null;
    longitud?: number | null;
    altitudMinM?: number | null;
    altitudMaxM?: number | null;
}

// Condición verificable del checklist de transporte CAT → planta
export interface CondicionTransporte {
    clave: string;
    etiqueta: string;
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

// La devolución nace de un despacho: el cliente se deriva de él.
// La fecha la sella el servidor al registrarla.
export interface RegistrarDevolucionRequest {
    despachoId: number;
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
