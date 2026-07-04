import client from "./client";
import type {
    Faenamiento,
    Despacho, RegistrarDespachoRequest,
    InkJetCodigo, QRResponse, PaginaPublica,
    RetornoProductora, LoteDisponible,
    RegistrarFaenamientoBatchRequest, FaenamientoBatchResultado,
} from "../types/faenamiento";
import type { Devolucion, RegistrarDevolucionRequest } from "../types/admin";

export const faenamientoApi = {
    // Lotes cerrados con animales pendientes de faenar (saldo > 0)
    lotesDisponibles: async () => {
        const { data } = await client.get<LoteDisponible[]>(
            "/api/faenamiento/lotes-disponibles");
        return data;
    },

    // Sesión de faenamiento que puede tomar animales de varios lotes
    registrarBatch: async (body: RegistrarFaenamientoBatchRequest) => {
        const { data } = await client.post<FaenamientoBatchResultado>(
            "/api/faenamiento/batch", body);
        return data;
    },

    listar: async (params?: { desde?: string; hasta?: string }) => {
        const { data } = await client.get<Faenamiento[]>("/api/faenamiento", { params });
        return data;
    },

    obtenerPorCodigoLote: async (codigoLote: string) => {
        const { data } = await client.get<Faenamiento>(
            `/api/faenamiento/lote/codigo/${codigoLote}`
        );
        return data;
    },

    obtenerInkJet: async (codigoLote: string) => {
        const { data } = await client.get<InkJetCodigo>(
            `/api/faenamiento/inkjet/${codigoLote}`
        );
        return data;
    },

    registrarDespacho: async (body: RegistrarDespachoRequest) => {
        const { data } = await client.post<Despacho>("/api/faenamiento/despachos", body);
        return data;
    },

    // Devoluciones de clientes — RF-307
    registrarDevolucion: async (body: RegistrarDevolucionRequest) => {
        const { data } = await client.post<Devolucion>(
            "/api/faenamiento/devoluciones", body);
        return data;
    },

    listarDevoluciones: async (params?: {
        desde?: string; hasta?: string; productoraId?: number;
    }) => {
        const { data } = await client.get<Devolucion[]>(
            "/api/faenamiento/devoluciones", { params });
        return data;
    },

    // Retornos de cuyes no aptos a su productora de origen
    listarRetornos: async (params?: {
        desde?: string; hasta?: string; productoraId?: number;
    }) => {
        const { data } = await client.get<RetornoProductora[]>(
            "/api/faenamiento/retornos", { params });
        return data;
    },

    generarQR: async (codigoLote: string) => {
        const { data } = await client.post<QRResponse>(`/api/qr/${codigoLote}`);
        return data;
    },

    obtenerQR: async (codigoLote: string) => {
        const { data } = await client.get<QRResponse>(`/api/qr/${codigoLote}`);
        return data;
    },

    descargarQRPng: async (codigoLote: string) => {
        const { data } = await client.get<Blob>(
            `/api/qr/${codigoLote}/png`,
            { responseType: "blob" }
        );
        return data;
    },

    paginaPublica: async (codigoLote: string) => {
        const { data } = await client.get<PaginaPublica>(
            `/api/qr/publico/${codigoLote}`
        );
        return data;
    },
};