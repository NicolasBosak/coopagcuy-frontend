import client from "./client";
import type {
    Usuario, CrearUsuarioRequest, ActualizarUsuarioRequest,
    Comunidad, GuardarComunidadRequest,
} from "../types/admin";

export const usuariosApi = {
    listar: async (incluirInactivos = true) => {
        const { data } = await client.get<Usuario[]>("/api/usuarios", {
            params: { incluirInactivos },
        });
        return data;
    },

    crear: async (body: CrearUsuarioRequest) => {
        const { data } = await client.post<Usuario>("/api/usuarios", body);
        return data;
    },

    actualizar: async (id: number, body: ActualizarUsuarioRequest) => {
        await client.put(`/api/usuarios/${id}`, body);
    },

    cambiarEstado: async (id: number, activo: boolean) => {
        await client.patch(`/api/usuarios/${id}/estado`, { activo });
    },
};

export const catalogosApi = {
    listarComunidades: async (incluirInactivas = false) => {
        const { data } = await client.get<Comunidad[]>("/api/catalogos/comunidades", {
            params: { incluirInactivas },
        });
        return data;
    },

    crearComunidad: async (body: GuardarComunidadRequest) => {
        const { data } = await client.post<Comunidad>("/api/catalogos/comunidades", body);
        return data;
    },

    actualizarComunidad: async (id: number, body: GuardarComunidadRequest) => {
        await client.put(`/api/catalogos/comunidades/${id}`, body);
    },

    cambiarEstadoComunidad: async (id: number, activa: boolean) => {
        await client.patch(`/api/catalogos/comunidades/${id}/estado`, { activa });
    },
};
