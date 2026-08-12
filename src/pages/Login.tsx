import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { authApi } from "../api/auth";
import type { LoginRequest } from "../types/auth";

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
            const data = await authApi.login(form);
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
        <div className="min-h-screen bg-crema textura-campo flex items-center
                justify-center p-4">
            {/* Halo chartreuse detrás del cuy: la firma de marca, contenida
                en un solo lugar. El mascota es el héroe del login. */}
            <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b
                    from-lima-100 to-transparent pointer-events-none" />

            <div className="relative w-full max-w-md">

                {/* El logo completo es el héroe: mascota sobre chartreuse +
                    logotipo. No repetimos el nombre debajo porque el logo ya
                    lo dice. */}
                <div className="text-center mb-7 animate-fade-in-up">
                    <img
                        src="/brand/cuy-logo-full.png"
                        alt="Cuy Azuayito — Sabor de altura · APAGCUY"
                        className="mx-auto w-44 sm:w-52 h-auto drop-shadow-sm"
                    />
                    <p className="mt-3 text-sm font-medium text-primary-700">
                        Sistema de Trazabilidad · COOPAGCUY
                    </p>
                </div>

                {/* Tarjeta del formulario, con un filo chartreuse arriba que
                    ata la tarjeta al logo sin competir con él. */}
                <div className="bg-white rounded-3xl shadow-lg shadow-primary-900/5
                        border border-primary-100 overflow-hidden animate-fade-in-up">
                    <div className="h-1.5 bg-lima-400" />
                    <div className="p-8">
                    <h2 className="text-xl text-gray-900 mb-6">
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
                            className="w-full min-h-[48px] px-4 bg-primary-600
                         hover:bg-primary-700 disabled:bg-primary-300 text-white
                         font-display rounded-xl text-base transition
                         active:scale-[0.99]"
                        >
                            {loading ? "Ingresando..." : "Ingresar"}
                        </button>
                    </form>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">
                    Proyecto Familias Campesinas Liderando · Comisión Europea
                </p>
            </div>
        </div>
    );
}