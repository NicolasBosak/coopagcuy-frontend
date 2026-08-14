import { useState } from "react";
import { Link } from "react-router-dom";
import { recuperacionApi } from "../api/recuperacion";
import { esCedulaValida } from "../utils/validarCedula";

export default function RecuperarPassword() {
    const [cedula, setCedula] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [enviado, setEnviado] = useState(false);
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Se valida ANTES de llamar al servidor: el dígito verificador atrapa
        // casi todo error de tipeo sin tocar la red, y en una tablet con mala
        // señal eso es la diferencia entre respuesta inmediata y quince
        // segundos de espera. El servidor lo revalida igual.
        if (!esCedulaValida(cedula)) {
            setError("Ese número de cédula no es válido. Revisa los diez dígitos.");
            return;
        }

        setCargando(true);
        try {
            await recuperacionApi.solicitar(cedula);
            setEnviado(true);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo enviar la solicitud. Verifica tu conexión "
                + "e intenta de nuevo.");
        } finally {
            setCargando(false);
        }
    };

    const campo = "w-full px-3.5 py-3 bg-blanco border border-gray-300 rounded-xl "
        + "text-sm text-gray-900 placeholder:text-gray-400 "
        + "focus:border-primary-600 focus:outline-none "
        + "transition-colors duration-150";

    return (
        <div className="min-h-screen bg-superficie flex items-center justify-center
                    px-6 py-10">
            <div className="w-full max-w-sm bg-blanco rounded-3xl border
                      border-gray-200 px-6 sm:px-8 py-8 animate-fade-in-up">

                <img
                    src="/brand/aliados/cuy-azuayito.png"
                    alt="Cuy Azuayito — COOPAGCUY"
                    className="h-20 w-auto mx-auto mb-8"
                />

                {enviado ? (
                    /* Mensaje deliberadamente idéntico exista o no la cuenta:
                       decir "esa cédula no está registrada" permitiría a
                       cualquiera averiguar quién tiene acceso al sistema. */
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary-50 mx-auto
                            mb-4 flex items-center justify-center text-2xl">
                            ✓
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight
                           text-gray-900 mb-2">
                            Solicitud enviada
                        </h1>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            El administrador recibió tu solicitud. Se pondrá en
                            contacto contigo para darte una contraseña nueva.
                        </p>
                        <Link to="/login"
                            className="inline-block mt-8 text-sm font-semibold
                         text-primary-600 hover:text-primary-800">
                            Volver al inicio de sesión
                        </Link>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-extrabold tracking-tight
                           text-gray-900 mb-2">
                            Recuperar contraseña
                        </h1>
                        <p className="text-sm text-gray-500 mb-7 leading-relaxed">
                            Escribe tu número de cédula. El administrador
                            recibirá tu solicitud y te contactará para darte
                            una contraseña nueva.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
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
                                    value={cedula}
                                    onChange={(e) => {
                                        setCedula(e.target.value.replace(/\D/g, ""));
                                        setError(null);
                                    }}
                                    placeholder="0102030405"
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
                                disabled={cargando}
                                className="w-full min-h-[52px] px-4 bg-primary-600
                           hover:bg-primary-700 disabled:bg-primary-300
                           disabled:cursor-not-allowed text-blanco
                           font-display text-base rounded-xl
                           shadow-sm shadow-primary-900/20
                           transition-colors duration-150"
                            >
                                {cargando ? "Enviando…" : "Enviar solicitud"}
                            </button>
                        </form>

                        <Link to="/login"
                            className="block text-center mt-6 text-sm font-semibold
                         text-gray-500 hover:text-gray-800">
                            Volver al inicio de sesión
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
