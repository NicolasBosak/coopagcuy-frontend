import client from "./client";
import type {
    Pago, RegistrarPagoRequest, LotePendientePago,
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
};
