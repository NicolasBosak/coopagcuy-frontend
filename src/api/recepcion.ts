import client from "./client";
import type {
    Lote,
    RegistrarEntregaRequest, EntregaResultado,
    Movilizacion, RegistrarMovilizacionRequest,
    ConfirmarRecepcionPlantaRequest,
} from "../types/recepcion";

export const recepcionApi = {
    // ── Entregas: la jaula del CAT se arma acumulando hasta 20 ────────

    registrarEntrega: async (body: RegistrarEntregaRequest) => {
        const { data } = await client.post<EntregaResultado>(
            "/api/recepcion/entregas", body);
        return data;
    },

    obtenerLoteAbierto: async (cat: string) => {
        const res = await client.get<Lote>("/api/recepcion/lotes/abierto", {
            params: { cat },
        });
        // 204 = no hay jaula abierta en ese CAT
        return res.status === 204 ? null : res.data;
    },

    cerrarLote: async (codigoLote: string) => {
        const { data } = await client.post<Lote>(
            `/api/recepcion/lotes/${codigoLote}/cerrar`);
        return data;
    },

    listarLotes: async (params?: {
        cat?: string; estado?: string;
        desde?: string; hasta?: string;
    }) => {
        const { data } = await client.get<Lote[]>("/api/recepcion/lotes", { params });
        return data;
    },

    // Guía de movilización en PDF — RF-210
    descargarGuia: async (codigoLote: string) => {
        const { data } = await client.get<Blob>(
            `/api/recepcion/lotes/${codigoLote}/guia`,
            { responseType: "blob" }
        );
        return data;
    },

    // ── Movilización CAT → planta (eslabón transporte) ────────────────

    registrarMovilizacion: async (
        codigoLote: string, body: RegistrarMovilizacionRequest) => {
        const { data } = await client.post<Movilizacion>(
            `/api/recepcion/lotes/${codigoLote}/movilizacion`, body);
        return data;
    },

    confirmarRecepcionPlanta: async (
        id: number, body: ConfirmarRecepcionPlantaRequest) => {
        const { data } = await client.patch<Movilizacion>(
            `/api/recepcion/movilizaciones/${id}/recepcion`, body);
        return data;
    },

    listarMovilizaciones: async (pendientes?: boolean) => {
        const { data } = await client.get<Movilizacion[]>(
            "/api/recepcion/movilizaciones",
            { params: pendientes === undefined ? undefined : { pendientes } });
        return data;
    },

    obtenerMovilizacion: async (codigoLote: string) => {
        const { data } = await client.get<Movilizacion>(
            `/api/recepcion/lotes/${codigoLote}/movilizacion`);
        return data;
    },
};