import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { authApi } from "../api/auth";
import type { LoginRequest } from "../types/auth";

/* Un azulejo por logo. Los PNG de las instituciones traen fondo blanco
   opaco, así que en vez de disimularlo lo declaramos: el blanco es la
   superficie de contenido del sistema y el logo se apoya en ella. */
function Azulejo({ src, alto, nombre, caja, retraso, prioritario = false }: {
    src: string;
    /* Altura explícita por logo. Es lo que equilibra ópticamente logos de
       proporciones muy distintas: con cajas iguales y object-contain, un
       logotipo horizontal aplasta siempre a uno vertical. */
    alto: string;
    /* Altura y respiro de la caja: uniformes dentro de cada nivel. El ancho
       lo pone el logo, y por eso los azulejos de un nivel tienen anchos
       distintos y la misma altura. */
    caja: string;
    nombre: string;
    retraso: number;
    /* Los logos sobre el pliegue se cargan de inmediato: diferirlos retrasa
       el primer pintado grande, que en este login son justamente ellos. */
    prioritario?: boolean;
}) {
    return (
        <div
            className={`azulejo ${caja} animate-fade-in-up`}
            style={{ animationDelay: `${retraso}ms` }}
        >
            <img src={src} alt={nombre}
                loading={prioritario ? "eager" : "lazy"}
                fetchPriority={prioritario ? "high" : "auto"}
                className={`${alto} w-auto max-w-full object-contain`} />
        </div>
    );
}

/* Separador entre niveles de la jerarquía. La etiqueta dice la relación
   real de cada institución con el proyecto; no es decoración. */
function Nivel({ etiqueta, retraso }: { etiqueta: string; retraso: number }) {
    return (
        <div className="flex items-center gap-4 animate-fade-in"
            style={{ animationDelay: `${retraso}ms` }}>
            <span className="h-px flex-1 bg-gray-300" />
            <span className="text-[11px] font-semibold uppercase
                       tracking-[0.18em] text-gray-500 whitespace-nowrap">
                {etiqueta}
            </span>
            <span className="h-px flex-1 bg-gray-300" />
        </div>
    );
}

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

    const campo = "w-full px-3.5 py-3 bg-blanco border border-gray-300 rounded-xl "
        + "text-sm text-gray-900 placeholder:text-gray-400 "
        + "focus:border-primary-600 focus:outline-none "
        + "transition-colors duration-150";

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">

            {/* ── Columna del formulario · blanco · 35% ─────────────────── */}
            <div className="bg-blanco w-full lg:w-[35%] lg:min-w-[400px] shrink-0
                      flex items-center justify-center
                      px-6 py-10 sm:px-10 lg:px-12">
                <div className="w-full max-w-sm">

                    {/* El logo corona la columna. Es el único de los ocho con
                        transparencia real, así que es también el único que no
                        necesita azulejo: se apoya directo sobre el blanco. */}
                    <img
                        src="/brand/aliados/cuy-azuayito.png"
                        alt="Cuy Azuayito — Sabor de altura · COOPPAGCUY"
                        fetchPriority="high"
                        className="h-[140px] sm:h-40 w-auto mx-auto mb-10
                             animate-fade-in-up"
                    />

                    <div className="filo h-1 w-10 rounded-full mb-5
                              animate-filo-ancho origin-left" />

                    {/* El logo ya dice COOPAGCUY; repetirlo aquí sobra. */}
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]
                            text-primary-700 animate-fade-in-up"
                        style={{ animationDelay: "60ms" }}>
                        Sistema de trazabilidad
                    </p>

                    <h1 className="text-3xl text-gray-900 mt-2 mb-8 animate-fade-in-up"
                        style={{ animationDelay: "60ms" }}>
                        Iniciar sesión
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="animate-fade-in-up"
                            style={{ animationDelay: "120ms" }}>
                            <label htmlFor="cedula"
                                className="block text-sm font-medium text-gray-700 mb-1.5">
                                Número de cédula
                            </label>
                            <input
                                id="cedula"
                                type="text"
                                required
                                autoFocus
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
                                className={campo}
                            />
                        </div>

                        <div className="animate-fade-in-up"
                            style={{ animationDelay: "180ms" }}>
                            <label htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-1.5">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className={campo}
                            />
                        </div>

                        {error && (
                            <div role="alert"
                                className="bg-teja-50 border border-teja-200 rounded-xl
                              px-3.5 py-3 text-sm text-teja-700 animate-fade-in">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{ animationDelay: "240ms" }}
                            className="w-full min-h-[52px] px-4 bg-primary-600
                         hover:bg-primary-700 disabled:bg-primary-300
                         disabled:cursor-not-allowed text-blanco
                         font-display text-base rounded-xl
                         shadow-sm shadow-primary-900/20
                         transition-colors duration-150
                         animate-fade-in-up"
                        >
                            {loading ? "Ingresando…" : "Ingresar"}
                        </button>
                    </form>

                    <Link
                        to="/recuperar-password"
                        className="block text-center mt-5 text-sm font-semibold
                       text-primary-600 hover:text-primary-800
                       animate-fade-in-up"
                        style={{ animationDelay: "280ms" }}
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>

                    <p className="text-xs text-gray-500 mt-10 leading-relaxed
                            animate-fade-in" style={{ animationDelay: "300ms" }}>
                        Proyecto Familias Campesinas Liderando
                        <br />
                        Cofinanciado por la Unión Europea
                    </p>
                </div>
            </div>

            {/* ── El filo ───────────────────────────────────────────────────
                La firma del sistema y, aquí, la división entre las columnas.
                Blanco contra gris da 1.19:1 — se distingue apenas —, así que
                el filo no es adorno: es lo que hace legible la separación. */}
            <div className="filo w-full h-1 lg:w-1 lg:h-auto
                      lg:animate-filo-crecer lg:origin-top" />

            {/* ── Columna de los logotipos · gris · 65% ─────────────────── */}
            <div className="bg-superficie flex-1 flex items-center justify-center
                      px-6 py-12 sm:px-10 lg:px-14
                      lg:shadow-[inset_10px_0_20px_-14px_rgba(0,0,0,0.15)]">
                <div className="w-full max-w-2xl space-y-7 sm:space-y-9">

                    {/* Nivel 1 — el proyecto que respalda el sistema. Va solo y
                        centrado: el producto ahora corona la otra columna. */}
                    <div className="flex justify-center">
                        <Azulejo
                            src="/brand/aliados/familias-campesinas.png"
                            nombre="Familias Campesinas Liderando"
                            caja="h-52 sm:h-64 px-12 sm:px-16"
                            alto="h-24 sm:h-32"
                            retraso={60} prioritario
                        />
                    </div>

                    <Nivel etiqueta="Con el apoyo de" retraso={110} />

                    {/* Nivel 2 — quien cofinancia y quien ejecuta */}
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
                        <Azulejo
                            src="/brand/aliados/ayuda-en-accion.png"
                            nombre="Ayuda en Acción"
                            caja="h-24 sm:h-28 px-8 sm:px-10"
                            alto="h-9 sm:h-10"
                            retraso={150}
                        />
                        <Azulejo
                            src="/brand/aliados/union-europea.png"
                            nombre="Cofinanciado por la Unión Europea"
                            caja="h-24 sm:h-28 px-8 sm:px-10"
                            alto="h-9 sm:h-10"
                            retraso={180}
                        />
                    </div>

                    <Nivel etiqueta="Aliados locales" retraso={220} />

                    {/* Nivel 3 — gobiernos locales y academia */}
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                        <Azulejo
                            src="/brand/aliados/nabon.png"
                            nombre="Alcaldía de Nabón"
                            caja="h-24 px-6" alto="h-11" retraso={250}
                        />
                        <Azulejo
                            src="/brand/aliados/santa-isabel.png"
                            nombre="Alcaldía de Santa Isabel"
                            caja="h-24 px-6" alto="h-12" retraso={275}
                        />
                        <Azulejo
                            src="/brand/aliados/pucara.png"
                            nombre="Alcaldía de Pucará"
                            caja="h-24 px-6" alto="h-12" retraso={300}
                        />
                        <Azulejo
                            src="/brand/aliados/universidad-catolica.png"
                            nombre="Universidad Católica de Cuenca"
                            caja="h-24 px-6" alto="h-12" retraso={320}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
