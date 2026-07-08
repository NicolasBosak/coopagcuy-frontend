import client from "./client";
import type {
    Dashboard, ReporteProductora, ReporteCAT, ReporteNovedad,
    ReporteDevoluciones, ReporteEntrada, ReporteTransito, ReporteSalida,
} from "../types/reportes";

interface FiltroPeriodo {
    desde: string;
    hasta: string;
    cat?: string;
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
};