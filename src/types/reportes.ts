export interface Dashboard {
    lotesActivos: number;
    animalesRecibidosPeriodo: number;
    // Tasas sobre animales, no sobre jaulas
    tasaAceptacion: number;
    tasaConNovedad: number;
    tasaRechazado: number;
    animalesAceptados: number;
    animalesConNovedad: number;
    animalesRechazados: number;
    lotesConQR: number;
    totalProductoras: number;
    totalFaenamientos: number;
    fechaCorte: string;
    // Etapas posteriores a la recepción en el CAT
    retornosDesdePlanta: number;
    devolucionesClientes: number;
    unidadesDevueltas: number;
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
    tipoMercado: string;
    ubicacion: string;
    unidades: number;
    responsable: string;
}

// ── Reporte de ganancias y margen ──────────────────────────────────────
//
// Dos cifras que NUNCA se suman: lo que cobraron las productoras (estos
// tres DTOs) y el margen de la reventa (el siguiente). Un pago a una
// productora es ingreso para ella y costo para la cooperativa — la misma
// fila leída desde dos lados.
//
// Dentro de "lo que cobraron las productoras" hay otra separación que
// tampoco se suma: cobrado es dinero que la CAT ya tiene en la mano,
// pactado es un compromiso a cuotas que todavía no ha llegado, y lo
// pagado por la planta es la otra vía de cobro.

export interface GananciaProductoraDto {
    productoraId: number;
    nombreProductora: string;
    comunidad: string;
    centroAcopio: string;
    cobradoLocal: number;
    pactadoCuotas: number;
    pagadoPlanta: number;
    totalPagos: number; // conteo de pagos, no dinero
}

export interface GananciaCatDto {
    centroAcopio: string;
    cobradoLocal: number;
    pactadoCuotas: number;
    pagadoPlanta: number;
    totalPagos: number; // conteo de pagos, no dinero
}

export interface GananciaMesDto {
    anio: number;
    mes: number;
    cobradoLocal: number;
    pactadoCuotas: number;
    pagadoPlanta: number;
    totalPagos: number; // conteo de pagos, no dinero
}

// Margen de la reventa. despachosSinPrecio y animalesSinCosto se muestran
// junto a la cifra en vez de contarse como cero: un despacho sin precio no
// se vendió gratis, y un animal cuya productora no ha cobrado no costó cero.
// ingreso ya es neto de devoluciones (S1); unidadesDevueltas se muestra por
// el mismo motivo que los otros dos contadores: un despacho enteramente
// devuelto aporta $0 sin dejar rastro si esta columna no existiera.
export interface MargenDto {
    agrupacion: string;
    ingreso: number;
    costoAtribuido: number;
    margen: number;
    despachosSinPrecio: number;
    animalesSinCosto: number;
    unidadesDevueltas: number;
}