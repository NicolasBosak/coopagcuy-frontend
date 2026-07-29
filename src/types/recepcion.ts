export type EstadoLote = "Aceptado" | "ConNovedad" | "Rechazado";
export type EstadoOreja = "Blanda" | "Semiblanda" | "Dura";
export type ColorPelaje = "Blanco" | "Bayo" | "Plomo" | "Combinado" | "Negro";
export type TamanoAnimal = "Normal" | "Pequeno" | "Grande";
// "en_revision": la entrega se envió pero su cédula no tenía productora en el
// centro; quedó en la bandeja de vinculación del administrador. El dispositivo
// ya no la reenvía.
export type EstadoSync = "pendiente" | "sincronizado" | "error" | "en_revision";

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
    // Captura offline sin catálogo: cuando no se tiene el Id de la productora
    // se envía su cédula y el servidor la resuelve al sincronizar. Si la
    // cédula es válida pero no coincide con ninguna productora del centro, la
    // entrega va a la bandeja de vinculación.
    cedulaProductora?: string;
    // Solo para el sync offline: momento en que la tablet capturó la entrega.
    // En línea lo sella el servidor y este campo se omite.
    fechaCapturaOffline?: string;
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
    // Entregas con cédula válida sin productora: encoladas en la bandeja
    totalPendientesVinculacion: number;
    resultados: {
        idCliente: string | null;
        exito: boolean;
        duplicada: boolean;
        pendienteVinculacion: boolean;
        motivo: string | null;
    }[];
}

// ── Bandeja de vinculación (admin) ────────────────────────────────────

// Entrega capturada offline con cédula válida sin productora en el centro.
// Un administrador la asigna a la productora correcta o la descarta.
export interface VinculacionPendiente {
    id: number;
    cedula: string;
    centroAcopio: string;
    fechaCaptura: string;
    enAyunas: boolean;
    responsableRecepcion: string;
    observaciones: string | null;
    cantidadCuyes: number;
    pesoTotalGramos: number;
    dispositivoId: string;
    fechaCreacion: string;
}

// ── Movilización CAT → planta (eslabón transporte) ────────────────────

// La fecha de salida la sella el servidor al registrar la movilización
export interface RegistrarMovilizacionRequest {
    conductor: string;
    cantidadMovilizada: number;
    // Claves del catálogo de condiciones que el operador verificó.
    // El servidor arma el texto: ya no se escribe a mano.
    condicionesTransporte: string[];
    tipoForraje?: string;
    diasRetiroMedicamentos?: number;
    responsableDespacho: string;
    observaciones?: string;
}

// La fecha de llegada la sella el servidor al confirmar la recepción
export interface ConfirmarRecepcionPlantaRequest {
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