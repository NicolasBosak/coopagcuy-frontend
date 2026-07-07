export interface Dashboard {
    lotesActivos: number;
    animalesRecibidosPeriodo: number;
    tasaAceptacion: number;
    tasaConNovedad: number;
    tasaRechazado: number;
    lotesConQR: number;
    totalProductoras: number;
    totalFaenamientos: number;
    fechaCorte: string;
}

export interface ReporteProductora {
    productoraId: number;
    nombreProductora: string;
    comunidad: string;
    centroAcopio: string;
    totalLotes: number;
    totalAnimales: number;
    lotesAceptados: number;
    lotesConNovedad: number;
    lotesRechazados: number;
    pesoTotalGramos: number;
    pesoPromedioGramos: number;
    ultimaEntrega: string | null;
}

export interface ReporteCAT {
    centroAcopio: string;
    totalLotes: number;
    totalAnimales: number;
    lotesAceptados: number;
    lotesConNovedad: number;
    lotesRechazados: number;
    tasaAceptacion: number;
    pesoTotalGramos: number;
}

export interface ReporteNovedad {
    novedadId: number;
    codigoLote: string;
    nombreProductora: string;
    comunidad: string;
    centroAcopio: string;
    tipoNovedad: string;
    descripcion: string;
    pesoRegistradoGramos: number | null;
    fechaRegistro: string;
    registradoPor: string;
}

// ── Reporte de devoluciones y retornos ────────────────────────────────

export interface ReporteDevoluciones {
    totalDevolucionesClientes: number;
    totalUnidadesDevueltas: number;
    totalRetornosProductora: number;
    devolucionesClientes: DevolucionItem[];
    retornosProductora: RetornoItem[];
}

export interface DevolucionItem {
    id: number;
    codigoLote: string;
    numeroSesion: number | null;
    nombreProductora: string;
    comunidad: string;
    clienteDevuelve: string;
    fechaDevolucion: string;
    cantidadUnidades: number;
    motivo: string;
}

export interface RetornoItem {
    id: number;
    codigoLote: string;
    nombreProductora: string;
    comunidad: string;
    numeroEnLote: number;
    motivo: string;
    fechaRetorno: string;
    responsable: string;
}

// ── Flujo de trazabilidad: Entrada / Tránsito / Salida ────────────────

export interface ReporteEntrada {
    codigoLote: string;
    centroAcopio: string;
    productora: string;
    comunidad: string;
    cantidadEnEspera: number;
    fechaLlegada: string;
}

export interface ReporteTransito {
    codigoLoteFaenado: string;
    fechaFaenamiento: string;
    operario: string;
    jaulasOrigen: string;
    comunidades: string;
    unidades: number;
    pesoTotalGramos: number;
    pesoPromedioGramos: number;
    estado: string;
}

export interface ReporteSalida {
    codigoLoteFaenado: string;
    fechaDespacho: string;
    cliente: string;
    chofer: string;
    ruta: string;
    unidades: number;
    responsable: string;
}