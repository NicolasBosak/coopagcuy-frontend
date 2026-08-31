import client from "./client";
import type {
    Dashboard, ReporteProductora, ReporteCAT, ReporteNovedad,
    ReporteDevoluciones, ReporteEntrada, ReporteTransito, ReporteSalida,
    GananciaProductoraDto, GananciaCatDto, GananciaMesDto, MargenDto,
    UnidadesMesDto,
} from "../types/reportes";

interface FiltroPeriodo {
    desde: string;
    hasta: string;
    cat?: string;
}

// El margen de la reventa no acepta `cat`: un despacho reúne animales de
// varias jaulas y por tanto de varias CAT, así que filtrarlo por CAT
// duplicaría ingreso o marcaría "sin costo" a quien sí cobró.
//
// `cat?: never` no es decoración: omitir el campo sin más no basta, porque
// TypeScript solo revisa propiedades excedentes en literales frescos, no en
// variables — un FiltroPeriodo con `cat` pasaría igual por referencia. Al
// declarar `cat` como `never`, cualquier valor con `cat?: string` dentro
// (literal o variable) deja de ser asignable a este tipo, así que pasar el
// filtro equivocado a `margenPorMes`/`margenPorCliente` es un error de
// compilación, no una convención que alguien pueda romper sin que tsc avise.
interface FiltroSinCat {
    desde: string;
    hasta: string;
    cat?: never;
}

export const reportesApi = {
    dashboard: async (desde?: string, hasta?: string) => {
        const { data } = await client.get<Dashboard>("/api/reportes/dashboard", {
            params: { desde, hasta },
        });
        return data;
    },

    porProductora: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<ReporteProductora[]>(
            "/api/reportes/productoras", { params: filtro }
        );
        return data;
    },

    porCAT: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<ReporteCAT[]>(
            "/api/reportes/cat", { params: filtro }
        );
        return data;
    },

    novedades: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<ReporteNovedad[]>(
            "/api/reportes/novedades", { params: filtro }
        );
        return data;
    },

    exportarExcelProductoras: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/productoras",
            { params: filtro, responseType: "blob" }
        );
        return data;
    },

    exportarExcelNovedades: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/novedades",
            { params: filtro, responseType: "blob" }
        );
        return data;
    },

    exportarExcelCAT: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/cat",
            { params: filtro, responseType: "blob" }
        );
        return data;
    },

    // Dos hojas: devoluciones de clientes y retornos a productora
    exportarExcelDevoluciones: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/devoluciones",
            { params: filtro, responseType: "blob" }
        );
        return data;
    },

    // Devoluciones de clientes + retornos a productoras
    devoluciones: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<ReporteDevoluciones>(
            "/api/reportes/devoluciones", { params: filtro }
        );
        return data;
    },

    exportarPDFLote: async (codigoLote: string) => {
        const { data } = await client.get<Blob>(
            `/api/reportes/exportar/pdf/lote/${codigoLote}`,
            { responseType: "blob" }
        );
        return data;
    },

    // ── Flujo de trazabilidad: Entrada / Tránsito / Salida ────────────
    entrada: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<ReporteEntrada[]>(
            "/api/reportes/entrada", { params: filtro });
        return data;
    },
    transito: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<ReporteTransito[]>(
            "/api/reportes/transito", { params: filtro });
        return data;
    },
    salida: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<ReporteSalida[]>(
            "/api/reportes/salida", { params: filtro });
        return data;
    },
    exportarExcelEntrada: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/entrada",
            { params: filtro, responseType: "blob" });
        return data;
    },
    exportarExcelTransito: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/transito",
            { params: filtro, responseType: "blob" });
        return data;
    },
    exportarExcelSalida: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/salida",
            { params: filtro, responseType: "blob" });
        return data;
    },

    // Todos los dashboards en un libro, una hoja por cada uno
    exportarExcelGeneral: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/general",
            { params: filtro, responseType: "blob" });
        return data;
    },

    // ── Ganancias de productoras: lo que cobraron ──────────────────────
    // Las tres sí aceptan `cat`.
    gananciasPorProductora: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<GananciaProductoraDto[]>(
            "/api/reportes/ganancias/productoras", { params: filtro });
        return data;
    },
    gananciasPorCat: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<GananciaCatDto[]>(
            "/api/reportes/ganancias/cat", { params: filtro });
        return data;
    },
    gananciasPorMes: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<GananciaMesDto[]>(
            "/api/reportes/ganancias/mes", { params: filtro });
        return data;
    },

    // ── Margen de la reventa ────────────────────────────────────────────
    // Ninguna de las dos acepta `cat`: ver FiltroSinCat.
    margenPorMes: async (filtro: FiltroSinCat) => {
        const { data } = await client.get<MargenDto[]>(
            "/api/reportes/margen/mes", { params: filtro });
        return data;
    },
    margenPorCliente: async (filtro: FiltroSinCat) => {
        const { data } = await client.get<MargenDto[]>(
            "/api/reportes/margen/cliente", { params: filtro });
        return data;
    },

    // ── Unidades vendidas: las dos vías, separadas ──────────────────────
    // Acepta `cat`, a diferencia de las dos de margen: aquí el filtro sí
    // aplica, aunque solo a la columna de comunidad.
    unidadesPorMes: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<UnidadesMesDto[]>(
            "/api/reportes/unidades/mes", { params: filtro });
        return data;
    },

    exportarExcelGanancias: async (filtro: FiltroPeriodo) => {
        const { data } = await client.get<Blob>(
            "/api/reportes/exportar/excel/ganancias",
            { params: filtro, responseType: "blob" });
        return data;
    },
};