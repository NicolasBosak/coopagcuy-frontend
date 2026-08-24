import client from "./client";
import type {
    Lote,
    RegistrarEntregaRequest, EntregaResultado,
    Movilizacion, RegistrarMovilizacionRequest,
    ConfirmarRecepcionPlantaRequest,
    VinculacionPendiente,
} from "../types/recepcion";

export const recepcionApi = {
    // ── Entregas: la jaula del CAT se arma acumulando hasta su cupo ────

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

    // responseType blob: el endpoint devuelve image/jpeg, no JSON. Pasa por
    // `client` y no por fetch directo para que el interceptor adjunte el
    // Bearer (el token está en memoria, no en una cookie que viaje sola).
    fotoNovedad: async (novedadId: number): Promise<Blob> => {
        const res = await client.get<Blob>(
            `/api/recepcion/novedades/${novedadId}/foto`,
            { responseType: "blob" });
        return res.data;
    },

    // ── Movilización CAT → planta (eslabón transporte) ────────────────

    registrarMovilizacion: async (
        codigoLote: string, body: RegistrarMovilizacionRequest) => {
        const { data } = await client.post<Movilizacion>(
            `/api/recepcion/lotes/${codigoLote}/movilizacion`, body);
        return data;
    },

    // El cuerpo lleva también llegaronEnBuenEstado y condicionesLlegada
    // cuando el checklist de transporte salió incompleto (ver Faenamiento.tsx)
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

    // ── Bandeja de vinculación (admin) ────────────────────────────────

    listarVinculaciones: async () => {
        const { data } = await client.get<VinculacionPendiente[]>(
            "/api/recepcion/vinculaciones");
        return data;
    },

    // Asigna la entrega pendiente a una productora y la registra en su jaula
    resolverVinculacion: async (id: number, productoraId: number) => {
        await client.post(`/api/recepcion/vinculaciones/${id}/resolver`,
            { productoraId });
    },

    descartarVinculacion: async (id: number) => {
        await client.delete(`/api/recepcion/vinculaciones/${id}`);
    },
};