export interface Productora {
    id: number;
    nombreCompleto: string;
    cedula: string;
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
    comunidad: string;
    canton: string;
    catAsignado: string;
    telefono?: string;
}

export type CentroAcopio = "PAT" | "NIE" | "HUE" | "NAB" | "PEL";

// ── Pagos a productoras (registro digital) ────────────────────────────

export interface RegistrarPagoRequest {
    productoraId: number;
    loteId?: number;
    montoUsd: number;
    fechaPago: string;
    metodoPago: string;
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
    responsable: string;
    observaciones: string | null;
}

export const CENTROS_ACOPIO: { value: CentroAcopio; label: string }[] = [
    { value: "PAT", label: "Patococha" },
    { value: "NIE", label: "Las Nieves" },
    { value: "HUE", label: "Huertas" },
    { value: "NAB", label: "Nabón / El Progreso" },
    { value: "PEL", label: "Pelincay" },
];