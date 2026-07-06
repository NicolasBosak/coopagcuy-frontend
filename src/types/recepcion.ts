export type EstadoLote = "Aceptado" | "ConNovedad" | "Rechazado";
export type EstadoOreja = "Blanda" | "Semiblanda" | "Dura";
export type ColorPelaje = "Blanco" | "Bayo" | "Plomo" | "Combinado" | "Negro";
export type TamanoAnimal = "Normal" | "Pequeno" | "Grande";
export type EstadoSync = "pendiente" | "sincronizado" | "error";

// Datos de un cuy individual dentro del lote
export interface CuyRegistro {
    pesoGramos: number;
    colorPelaje: ColorPelaje;
    estadoOreja: EstadoOreja;
    tamanoAnimal: TamanoAnimal;
    signosClinicos?: string;
}

export interface CuyRegistroResponse {
    id: number;
    numeroEnLote: number;
    pesoGramos: number;
    colorPelaje: string;
    estadoOreja: string;
    tamanoAnimal: string;
    signosClinicos: string | null;
    estado: EstadoLote;
    motivoNovedad: string | null;
}

export interface Novedad {
    id: number;
    tipo: string;
    descripcion: string;
    pesoRegistradoGramos: number | null;
    fechaRegistro: string;
    registradoPor: string;
}

export interface ProductoraEnLote {
    productoraId: number;
    nombre: string;
    comunidad: string;
    cantidad: number;
}

export interface Lote {
    id: number;
    codigoLote: string;
    productoraId: number | null;
    nombreProductora: string;
    centroAcopio: string;
    fechaRecepcion: string;
    cantidadAnimales: number;
    pesoTotalGramos: number;
    estado: EstadoLote;
    responsableRecepcion: string | null;
    observaciones: string | null;
    sincronizadoOffline: boolean;
    cerrado: boolean;
    disponibles: number;
    // Ya tiene registro de movilización hacia la planta
    tieneMovilizacion: boolean;
    productoras: ProductoraEnLote[];
    novedades: Novedad[];
    cuyes: CuyRegistroResponse[];
}

// ── Entregas por productora: la jaula se arma acumulando ─────────────

export interface RegistrarEntregaRequest {
    centroAcopio: string;
    productoraId: number;
    fechaEntrega: string;
    cuyes: CuyRegistro[];
    enAyunas: boolean;
    responsableRecepcion: string;
    observaciones?: string;
    sincronizadoOffline?: boolean;
    dispositivoId?: string;
    // UUID local de la entrega offline: clave de idempotencia del sync
    idCliente?: string;
}

export interface EntregaResultado {
    cuyesRegistrados: number;
    lotesAfectados: Lote[];
    seCompletoJaula: boolean;
}

// Entrega guardada localmente en IndexedDB (antes de sincronizar)
export interface EntregaOffline extends RegistrarEntregaRequest {
    _tipo: "entrega";
    _id: string;           // UUID local temporal
    _estado: EstadoSync;
    _fechaCreacion: string;
    _intentos: number;
    _error?: string;
}

// El backend devuelve UN resultado por entrega, identificado por su
// idCliente: el emparejamiento es por Id, nunca por posición
export interface SyncResult {
    totalRecibidos: number;
    totalGuardados: number;
    // Reintentos de entregas ya sincronizadas: se marcan como listas
    // sin duplicar animales
    totalDuplicados: number;
    totalConError: number;
    resultados: {
        idCliente: string | null;
        exito: boolean;
        duplicada: boolean;
        motivo: string | null;
    }[];
}

// ── Movilización CAT → planta (eslabón transporte) ────────────────────

export interface RegistrarMovilizacionRequest {
    fechaDespacho: string;
    conductor: string;
    cantidadMovilizada: number;
    condicionesTransporte?: string;
    tipoForraje?: string;
    diasRetiroMedicamentos?: number;
    responsableDespacho: string;
    observaciones?: string;
}

export interface ConfirmarRecepcionPlantaRequest {
    fechaRecepcionPlanta: string;
    recibidoPor: string;
    condicionLlegada?: string;
}

export interface Movilizacion {
    id: number;
    loteId: number;
    codigoLote: string;
    centroAcopio: string;
    nombreProductora: string;
    fechaDespacho: string;
    conductor: string;
    cantidadMovilizada: number;
    condicionesTransporte: string | null;
    tipoForraje: string | null;
    diasRetiroMedicamentos: number | null;
    responsableDespacho: string;
    observaciones: string | null;
    fechaRecepcionPlanta: string | null;
    recibidoPor: string | null;
    condicionLlegada: string | null;
}