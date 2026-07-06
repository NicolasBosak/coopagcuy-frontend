import axios from "axios";

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "https://localhost:7275",
    headers: { "Content-Type": "application/json" },
});

// Adjunta el token JWT automáticamente en cada request
client.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("jwt_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Si el backend devuelve 401 con la sesión caducada, limpia y redirige
// al login. El propio POST de login se excluye: su 401 significa
// "credenciales incorrectas" y debe mostrarse en pantalla, no recargar.
client.interceptors.response.use(
    (response) => response,
    (error) => {
        const esLogin = error.config?.url?.includes("/api/auth/login");
        if (error.response?.status === 401 && !esLogin) {
            sessionStorage.removeItem("jwt_token");
            sessionStorage.removeItem("jwt_user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default client;