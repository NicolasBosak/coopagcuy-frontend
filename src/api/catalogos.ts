import client from "./client";
import type {
    Provincia, GuardarProvinciaRequest,
    Canton, GuardarCantonRequest,
    CentroAcopio, CrearCentroAcopioRequest, ActualizarCentroAcopioRequest,
} from "../types/admin";

export const geografiaApi = {
    listarProvincias: async (incluirInactivas = false) => {
        const { data } = await client.get<Provincia[]>("/api/catalogos/provincias", {
            params: { incluirInactivas },
        });
        return data;
    },

    crearProvincia: async (body: GuardarProvinciaRequest) => {
        const { data } = await client.post<Provincia>("/api/catalogos/provincias", body);
        return data;
    },

    actualizarProvincia: async (id: number, body: GuardarProvinciaRequest) => {
        await client.put(`/api/catalogos/provincias/${id}`, body);
    },

    cambiarEstadoProvincia: async (id: number, activa: boolean) => {
        await client.patch(`/api/catalogos/provincias/${id}/estado`, { activa });
    },

    listarCantones: async (provinciaId?: number, incluirInactivos = false) => {
        const { data } = await client.get<Canton[]>("/api/catalogos/cantones", {
            params: { provinciaId, incluirInactivos },
        });
        return data;
    },

    crearCanton: async (body: GuardarCantonRequest) => {
        const { data } = await client.post<Canton>("/api/catalogos/cantones", body);
        return data;
    },

    actualizarCanton: async (id: number, body: GuardarCantonRequest) => {
        await client.put(`/api/catalogos/cantones/${id}`, body);
    },

    cambiarEstadoCanton: async (id: number, activo: boolean) => {
        await client.patch(`/api/catalogos/cantones/${id}/estado`, { activo });
    },
};

export const centrosAcopioApi = {
    listar: async (incluirInactivos = false) => {
        const { data } = await client.get<CentroAcopio[]>(
            "/api/catalogos/centros-acopio", { params: { incluirInactivos } });
        return data;
    },

    crear: async (body: CrearCentroAcopioRequest) => {
        const { data } = await client.post<CentroAcopio>(
            "/api/catalogos/centros-acopio", body);
        return data;
    },

    // La ruta lleva el código porque el código ES la clave del recurso
    actualizar: async (codigo: string, body: ActualizarCentroAcopioRequest) => {
        await client.put(`/api/catalogos/centros-acopio/${codigo}`, body);
    },

    cambiarEstado: async (codigo: string, activo: boolean) => {
        await client.patch(`/api/catalogos/centros-acopio/${codigo}/estado`, { activo });
    },
};
