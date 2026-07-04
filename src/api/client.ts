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

// Si el backend devuelve 401, limpia la sesión y redirige al login
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            ``
            sessionStorage.removeItem("jwt_token");
            sessionStorage.removeItem("jwt_user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default client;