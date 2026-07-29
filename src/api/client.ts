import axios, { type AxiosRequestConfig } from "axios";
import { tokenStore } from "./tokenStore";
import { session } from "./session";

const baseURL = import.meta.env.VITE_API_URL ?? "https://localhost:7275";

const client = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
    // Imprescindible para que viaje la cookie httpOnly del refresh token
    withCredentials: true,
});

// Adjunta el access token (en memoria) en cada request
client.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Renovación silenciosa del access token ────────────────────────────
// Un solo refresh en vuelo: si varias requests reciben 401 a la vez, todas
// esperan la MISMA renovación en lugar de disparar una carrera de refreshes.
let refreshEnCurso: Promise<string | null> | null = null;

async function renovarToken(): Promise<string | null> {
    refreshEnCurso ??= (async () => {
        try {
            // axios "crudo": no pasa por los interceptores (evita recursión)
            const { data } = await axios.post(
                `${baseURL}/api/auth/refresh`, null, { withCredentials: true });
            tokenStore.set(data.token);
            if (data.rol) {
                session.guardar({
                    nombreCompleto: data.nombreCompleto,
                    cedula: data.cedula,
                    rol: data.rol,
                    catAsignado: data.catAsignado ?? null,
                    sesionExpira: data.sesionExpira,
                });
            }
            return data.token as string;
        } catch {
            return null;
        } finally {
            refreshEnCurso = null;
        }
    })();
    return refreshEnCurso;
}

function cerrarSesionLocal() {
    tokenStore.clear();
    session.limpiar();
    if (window.location.pathname !== "/login")
        window.location.href = "/login";
}

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config as
            (AxiosRequestConfig & { _reintentado?: boolean }) | undefined;
        const url: string = error.config?.url ?? "";
        const status = error.response?.status;

        // El login y el propio refresh no se reintentan: su 401 es terminal
        const esAuth = url.includes("/api/auth/login")
            || url.includes("/api/auth/refresh");

        if (status === 401 && original && !original._reintentado && !esAuth) {
            original._reintentado = true;
            const nuevo = await renovarToken();
            if (nuevo) {
                original.headers = {
                    ...original.headers,
                    Authorization: `Bearer ${nuevo}`,
                };
                return client(original);
            }
            // No se pudo renovar: la sesión de 7 días expiró o fue revocada
            cerrarSesionLocal();
        }

        return Promise.reject(error);
    }
);

export default client;
