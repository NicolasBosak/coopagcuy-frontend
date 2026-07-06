import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import type { LoginRequest, LoginResponse } from "../types/auth";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState<LoginRequest>({ cedula: "", password: "" });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data } = await client.post<LoginResponse>("/api/auth/login", form);
            login(data);
            navigate("/dashboard");
        } catch (e: unknown) {
            // Sin respuesta del servidor = problema de conexión (red, CORS,
            // API apagada), no de credenciales: mensajes distintos para
            // no confundir al operador
            const err = e as { response?: unknown };
            setError(err.response
                ? "Cédula o contraseña incorrectas. Intenta nuevamente."
                : "No se pudo conectar con el servidor. Verifica tu conexión "
                + "o avisa al administrador.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Logo y título */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16
                          bg-primary-600 rounded-2xl mb-4">
                        <span className="text-white text-2xl font-bold">C</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-primary-900">
                        Cuy Azuayito
                    </h1>
                    <p className="text-sm text-primary-700 mt-1">
                        Sistema de Trazabilidad · COOPAGCUY
                    </p>
                </div>

                {/* Tarjeta del formulario */}
                <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-8">
                    <h2 className="text-lg font-medium text-gray-800 mb-6">
                        Iniciar sesión
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número de cédula
                            </label>
                            <input
                                type="text"
                                required
                                inputMode="numeric"
                                autoComplete="username"
                                maxLength={10}
                                value={form.cedula}
                                onChange={(e) => setForm({
                                    ...form,
                                    // Solo dígitos: evita errores de tipeo
                                    cedula: e.target.value.replace(/\D/g, ""),
                                })}
                                placeholder="0102030405"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg
                           text-sm focus:outline-none focus:ring-2
                           focus:ring-primary-500 focus:border-transparent
                           transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg
                           text-sm focus:outline-none focus:ring-2
                           focus:ring-primary-500 focus:border-transparent
                           transition"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg
                              px-3 py-2.5 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700
                         disabled:bg-primary-300 text-white font-medium
                         rounded-lg text-sm transition"
                        >
                            {loading ? "Ingresando..." : "Ingresar"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-primary-600 mt-6">
                    Proyecto Familias Campesinas Liderando · Comisión Europea
                </p>
            </div>
        </div>
    );
}