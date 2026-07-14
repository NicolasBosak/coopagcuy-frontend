import client from "./client";
import type {
    Productora, CrearProductoraRequest,
    Pago, RegistrarPagoRequest, LotePendientePago,
} from "../types/productora";
import type { ProductoraCambio } from "../types/admin";

export const productorasApi = {
    listar: async (params?: {
        comunidad?: string; cat?: string; incluirInactivas?: boolean;
    }) => {
        const { data } = await client.get<Productora[]>("/api/productoras", { params });
        return data;
    },

    // Baja/alta lógica (conserva el historial)
    cambiarEstado: async (id: number, activa: boolean) => {
        await client.patch(`/api/productoras/${id}/estado`, { activa });
    },

    obtenerPorId: async (id: number) => {
        const { data } = await client.get<Productora>(`/api/productoras/${id}`);
        return data;
    },

    crear: async (body: CrearProductoraRequest) => {
        const { data } = await client.post<Productora>("/api/productoras", body);
        return data;
    },

    actualizar: async (id: number, body: CrearProductoraRequest) => {
        await client.put(`/api/productoras/${id}`, body);
    },

    // Historial de cambios — RF-105
    historial: async (id: number) => {
        const { data } = await client.get<ProductoraCambio[]>(
            `/api/productoras/${id}/historial`
        );
        return data;
    },
};

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
};