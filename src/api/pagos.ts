import client from "./client";
import type {
    Pago, RegistrarPagoRequest, LotePendientePago,
    TicketPorPagar, CuyConNovedad, RegistrarPagoEfectivoRequest,
} from "../types/productora";

// Pagos a productoras: registro digital que reemplaza el cuaderno manual
export const pagosApi = {
    registrar: async (body: RegistrarPagoRequest) => {
        const { data } = await client.post<Pago>("/api/pagos", body);
        return data;
    },

    listar: async (params?: {
        productoraId?: number; desde?: string; hasta?: string;
    }) => {
        const { data } = await client.get<Pago[]>("/api/pagos", { params });
        return data;
    },

    // Lotes por los que aún se le debe a la productora: el servidor ya excluye
    // los que ella tiene pagados, así que un lote pagado no vuelve a ofrecerse
    lotesPendientes: async (productoraId: number) => {
        const { data } = await client.get<LotePendientePago[]>(
            `/api/pagos/lotes-pendientes/${productoraId}`
        );
        return data;
    },

    // Pasa por `client` y no por una URL directa para que el interceptor
    // adjunte el Bearer: el token vive en memoria, no en una cookie.
    descargarTicket: async (pagoId: number): Promise<Blob> => {
        const { data } = await client.get<Blob>(
            `/api/pagos/${pagoId}/ticket`, { responseType: "blob" });
        return data;
    },

    // Bandeja de la planta. Distinta de lotesPendientes, que es de la CAT.
    porPagar: async () => {
        const { data } = await client.get<TicketPorPagar[]>(
            "/api/pagos/por-pagar");
        return data;
    },

    cuyesConNovedad: async (pagoId: number) => {
        const { data } = await client.get<CuyConNovedad[]>(
            `/api/pagos/${pagoId}/cuyes-con-novedad`);
        return data;
    },

    pagar: async (pagoId: number, body: RegistrarPagoEfectivoRequest) => {
        const { data } = await client.post<Pago>(
            `/api/pagos/${pagoId}/pagar`, body);
        return data;
    },

    // responseType blob: el endpoint devuelve image/jpeg, no JSON
    comprobante: async (pagoId: number): Promise<Blob> => {
        const { data } = await client.get<Blob>(
            `/api/pagos/${pagoId}/comprobante`, { responseType: "blob" });
        return data;
    },

    verificar: async (pagoId: number, verificadoPor: string) => {
        const { data } = await client.post<Pago>(
            `/api/pagos/${pagoId}/verificar`, { verificadoPor });
        return data;
    },
};
