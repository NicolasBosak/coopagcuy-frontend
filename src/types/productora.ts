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
    // Obligatorio: el ticket es por los cuyes de un lote concreto
    loteId: number;
    montoUsd: number;
    responsable: string;
    observaciones?: string;
}

export type EstadoPago = "Pendiente" | "Pagado" | "Recibido";

export interface Pago {
    id: number;
    productoraId: number;
    nombreProductora: string;
    loteId: number | null;
    codigoLote: string | null;
    montoUsd: number;
    fechaPago: string;
    metodoPago: string;
    estado: EstadoPago;
    montoPagadoUsd: number | null;
    fechaPagoEfectivo: string | null;
    pagadoPor: string | null;
    tieneComprobante: boolean;
    fechaVerificacion: string | null;
    verificadoPor: string | null;
    responsable: string;
    observaciones: string | null;
    // Distingue el pago normal (planta) de la venta directa en la comunidad,
    // que no pasa por la bandeja de la planta
    esVentaLocal: boolean;
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

// ── Bandeja de pagos de la planta ──────────────────────────────────────

// Ticket emitido por un CAT y pendiente de pago en la planta
export interface TicketPorPagar {
    pagoId: number;
    productoraId: number;
    nombreProductora: string;
    cedula: string;
    loteId: number;
    codigoLote: string;
    centroAcopio: string;
    fechaRecepcion: string;
    cuyesEntregados: number;
    montoUsd: number;
    fechaEmision: string;
}

// Cuy con novedad registrada por el CAT, candidato a descuento en la planta
export interface CuyConNovedad {
    cuyRegistroId: number;
    numeroEnLote: number;
    pesoGramos: number;
    novedadId: number;
    tipoNovedad: string;
    descripcion: string;
    tieneFoto: boolean;
}

export interface DescuentoRequest {
    novedadCatId: number;
    descripcion: string;
    montoUsd: number;
}

export interface RegistrarPagoEfectivoRequest {
    descuentos: DescuentoRequest[];
    comprobanteBase64: string;
    pagadoPor: string;
}

// ── Venta local (venta directa en la comunidad) ────────────────────────

// Cuy de un lote que la CAT todavía puede vender en la comunidad: el
// servidor ya excluye los que se vendieron o movilizaron. Un cuy con
// novedad (motivoNovedad no nulo) se puede vender igual — la planta lo
// rechazaría, pero es justo el candidato natural a venta local.
export interface CuyDisponible {
    cuyRegistroId: number;
    numeroEnLote: number;
    pesoGramos: number;
    estado: string;
    motivoNovedad: string | null;
}

export type MetodoVentaLocal = "Efectivo" | "Transferencia" | "Cuotas";

export interface RegistrarVentaLocalRequest {
    productoraId: number;
    loteId: number;
    cuyRegistroIds: number[];
    montoUsd: number;
    metodoPago: MetodoVentaLocal;
    // Solo cuando metodoPago es "Cuotas": el servidor devuelve 400 si falta
    // el acuerdo
    numeroDias?: number;
    valorPorDia?: number;
    responsable: string;
    observaciones?: string;
}

export const CENTROS_ACOPIO: { value: CentroAcopio; label: string }[] = [
    { value: "PAT", label: "Patococha" },
    { value: "NIE", label: "Las Nieves" },
    { value: "HUE", label: "Huertas" },
    { value: "NAB", label: "Nabón / El Progreso" },
    { value: "PEL", label: "Pelincay" },
];