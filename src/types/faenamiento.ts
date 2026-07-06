export type EstadoCanal = "Apto" | "ConNovedad" | "Rechazado";

export interface CuyFaenamientoRequest {
    numeroEnLote: number;
    pesoCanalGramos?: number;
    estado: EstadoCanal;
    motivo?: string;
    // Si el animal no es apto y se devuelve a su productora
    retornarAProductora: boolean;
}

export interface CuyFaenamientoResponse {
    id: number;
    numeroEnLote: number;
    pesoCanalGramos: number | null;
    estado: string;
    motivo: string | null;
    retornadoAProductora: boolean;
}

// ── Faenamiento por cuota: puede tomar animales de varios lotes ──────

export interface LoteDisponible {
    loteId: number;
    codigoLote: string;
    centroAcopio: string;
    fechaRecepcion: string;
    cantidadAnimales: number;
    disponibles: number;
    cuyesDisponibles: CuyDisponible[];
}

export interface CuyDisponible {
    numeroEnLote: number;
    pesoGramos: number;
    estadoRecepcion: string;
    motivoNovedad: string | null;
    nombreProductora: string | null;
    comunidad: string | null;
}

export interface RegistrarFaenamientoBatchRequest {
    fechaFaenamiento: string;
    operarioResponsable: string;
    temperaturaAlmacenamiento?: number;
    observaciones?: string;
    lotes: { loteId: number; cuyes: CuyFaenamientoRequest[] }[];
}

export interface FaenamientoBatchResultado {
    // Código único del producto terminado generado para toda la sesión
    codigoLoteFaenado: string;
    registros: Faenamiento[];
    alertasNovedadPrevia: AlertaNovedadPrevia[];
}

export interface AlertaNovedadPrevia {
    codigoLote: string;
    numeroEnLote: number;
    novedadRecepcion: string;
    nombreProductora: string | null;
    comunidad: string | null;
}

export interface RetornoProductora {
    id: number;
    loteId: number;
    codigoLote: string;
    productoraId: number;
    nombreProductora: string;
    comunidad: string;
    numeroEnLote: number;
    motivo: string;
    fechaRetorno: string;
    responsable: string;
}

// ── Despacho por lote faenado con detalle por animal ─────────────────

export interface RegistrarDespachoRequest {
    loteFaenadoId: number;
    // Animales específicos que se envían
    cuyFaenamientoIds: number[];
    clienteDestino: string;
    fechaDespacho: string;
    responsable: string;
    transporte?: string;
    observaciones?: string;
}

// Lote faenado con saldo despachable y sus animales disponibles
export interface LoteFaenadoDespachable {
    loteFaenadoId: number;
    codigo: string;
    fechaFaenamiento: string;
    totalFaenadas: number;
    despachadas: number;
    disponibles: number;
    cuyes: CuyDespachable[];
}

export interface CuyDespachable {
    cuyFaenamientoId: number;
    codigoJaula: string;
    numeroEnLote: number;
    pesoCanalGramos: number | null;
    estado: string;
}

export interface Faenamiento {
    id: number;
    // Distintivo de la sesión dentro del lote (F1, F2, …)
    numeroSesion: number;
    // Código del lote de producto terminado (FAE-…) al que pertenece
    codigoLoteFaenado: string | null;
    loteId: number;
    codigoLote: string;
    nombreProductora: string;
    comunidadOrigen: string;
    fechaFaenamiento: string;
    operarioResponsable: string;
    unidadesFaenadas: number;
    pesoTotalCanalGramos: number;
    pesoPromedioCanalGramos: number;
    temperaturaAlmacenamiento: number | null;
    estadoCanal: EstadoCanal;
    observaciones: string | null;
    unidadesDecomisadas: number;
    motivoDecomiso: string | null;
    tiempoLavadoMinutos: number | null;
    presentacionEmpaque: string | null;
    fechaIngresoFrio: string | null;
    fechaSalidaFrio: string | null;
    cuyes: CuyFaenamientoResponse[];
}

export interface Despacho {
    id: number;
    // Código del lote faenado (FAE-…); nulo en despachos antiguos que
    // apuntaban a la jaula (codigoLote)
    codigoLoteFaenado: string | null;
    codigoLote: string | null;
    clienteDestino: string;
    fechaDespacho: string;
    cantidadUnidades: number;
    // Unidades ya devueltas por el cliente (el restante es devolvible)
    unidadesDevueltas: number;
    responsable: string;
    transporte: string | null;
    observaciones: string | null;
    cuyes: { codigoJaula: string; numeroEnLote: number }[];
}

export interface InkJetCodigo {
    codigoLote: string;
    fechaFaenamiento: string;
    fechaVencimiento: string;
    comunidadOrigen: string;
    nombreProductora: string;
    unidadesFaenadas: number;
    pesoPromedioCanalGramos: number;
}

export interface QRResponse {
    id: number;
    codigoLote: string;
    urlPublica: string;
    urlQRImagen: string;
    activo: boolean;
    fechaGeneracion: string;
}

export interface PaginaPublica {
    codigoLote: string;
    comunidadOrigen: string;
    canton: string;
    nombreProductora: string;
    centroAcopio: string;
    fechaRecepcion: string;
    cantidadAnimales: number;
    estadoCalidad: string;
    parametrosAprobados: string[];
    fechaFaenamiento: string;
    pesoPromedioCanalGramos: number;
    estadoCanal: string;
    marca: string;
    // Trazabilidad hacia adelante
    fechaComercializacion: string | null;
    destinoComercial: string | null;
    // Novedades registradas en planta sobre los animales faenados
    observacionesProceso: string[];
    // Comunidades que aportaron animales, con su cantidad
    comunidadesAporte: { comunidad: string; cantidad: number }[];
    // Estado individual de cada animal faenado
    detalleCuyes: {
        comunidad: string;
        codigoJaula: string;
        numeroEnLote: number;
        pesoCanalGramos: number | null;
        estado: string;
    }[];
}