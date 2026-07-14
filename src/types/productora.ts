export interface Productora {
    id: number;
    nombreCompleto: string;
    cedula: string;
    comunidadId: number;
    // Nombre y cantón resueltos desde el catálogo (solo lectura)
    comunidad: string;
    canton: string;
    catAsignado: string;
    telefono: string | null;
    activa: boolean;
    fechaRegistro: string;
    // Cuyes retornados desde la planta por no aptos
    totalRetornos: number;
}

export interface CrearProductoraRequest {
    nombreCompleto: string;
    cedula: string;
    // Comunidad del catálogo; el cantón se deriva de ella en el servidor
    comunidadId: number;
    catAsignado: string;
    telefono?: string;
}

export type CentroAcopio = "PAT" | "NIE" | "HUE" | "NAB" | "PEL";

// ── Pagos a productoras (registro digital) ────────────────────────────

// La fecha del pago la sella el servidor al registrarlo
export interface RegistrarPagoRequest {
    productoraId: number;
    loteId?: number;
    montoUsd: number;
    metodoPago: string;          // "Contado" | "Credito"
    numeroDias?: number;         // solo crédito
    responsable: string;
    observaciones?: string;
}

export interface Pago {
    id: number;
    productoraId: number;
    nombreProductora: string;
    loteId: number | null;
    codigoLote: string | null;
    montoUsd: number;
    fechaPago: string;
    metodoPago: string;
    numeroDias: number | null;
    valorPorDia: number | null;
    responsable: string;
    observaciones: string | null;
}

// Lote por el que aún se le debe pagar a una productora. Cantidad y peso son
// el aporte de esa productora a la jaula, no el total de la jaula.
export interface LotePendientePago {
    loteId: number;
    codigoLote: string;
    centroAcopio: string;
    fechaRecepcion: string;
    cuyesEntregados: number;
    pesoEntregadoGramos: number;
}

export const CENTROS_ACOPIO: { value: CentroAcopio; label: string }[] = [
    { value: "PAT", label: "Patococha" },
    { value: "NIE", label: "Las Nieves" },
    { value: "HUE", label: "Huertas" },
    { value: "NAB", label: "Nabón / El Progreso" },
    { value: "PEL", label: "Pelincay" },
];