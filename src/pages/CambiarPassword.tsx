import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recuperacionApi } from "../api/recuperacion";
import { useAuth } from "../context/useAuth";
import { MainLayout } from "../components/layout/MainLayout";

export default function CambiarPassword() {
    const { debeCambiarPassword, marcarPasswordCambiada } = useAuth();
    const navigate = useNavigate();

    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [repetida, setRepetida] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (nueva !== repetida) {
            setError("Las dos contraseñas nuevas no coinciden.");
            return;
        }

        setCargando(true);
        try {
            await recuperacionApi.cambiarPassword(actual, nueva);
            marcarPasswordCambiada();
            navigate("/dashboard");
        } catch (e: unknown) {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo cambiar la contraseña. Verifica tu conexión.");
        } finally {
            setCargando(false);
        }
    };

    const campo = "w-full px-3.5 py-3 bg-blanco border border-gray-300 rounded-xl "
        + "text-sm text-gray-900 placeholder:text-gray-400 "
        + "focus:border-primary-600 focus:outline-none "
        + "transition-colors duration-150";

    const formulario = (
        <div className="w-full max-w-sm mx-auto">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2">
                {debeCambiarPassword ? "Crea tu contraseña" : "Cambiar contraseña"}
            </h1>
            <p className="text-sm text-gray-500 mb-7 leading-relaxed">
                {debeCambiarPassword
                    ? "Entraste con una contraseña temporal. Elige una propia "
                    + "para seguir: nadie más debe conocerla."
                    : "Debe tener al menos 8 caracteres, con una letra y un número."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="actual"
                        className="block text-sm font-medium text-gray-700 mb-1.5">
                        {debeCambiarPassword
                            ? "Contraseña temporal" : "Contraseña actual"}
                    </label>
                    <input id="actual" type="password" required
                        autoComplete="current-password"
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        className={campo} />
                </div>

                <div>
                    <label htmlFor="nueva"
                        className="block text-sm font-medium text-gray-700 mb-1.5">
                        Contraseña nueva
                    </label>
                    <input id="nueva" type="password" required
                        autoComplete="new-password"
                        value={nueva}
                        onChange={(e) => setNueva(e.target.value)}
                        className={campo} />
                    <p className="text-xs text-gray-400 mt-1.5">
                        Mínimo 8 caracteres, con al menos una letra y un número.
                    </p>
                </div>

                <div>
                    <label htmlFor="repetida"
                        className="block text-sm font-medium text-gray-700 mb-1.5">
                        Repite la contraseña nueva
                    </label>
                    <input id="repetida" type="password" required
                        autoComplete="new-password"
                        value={repetida}
                        onChange={(e) => setRepetida(e.target.value)}
                        className={campo} />
                </div>

                {error && (
                    <div role="alert"
                        className="bg-teja-50 border border-teja-200 rounded-xl
                        px-3.5 py-3 text-sm text-teja-700 animate-fade-in">
                        {error}
                    </div>
                )}

                <button type="submit" disabled={cargando}
                    className="w-full min-h-[52px] px-4 bg-primary-600
                     hover:bg-primary-700 disabled:bg-primary-300
                     disabled:cursor-not-allowed text-blanco
                     font-display text-base rounded-xl
                     shadow-sm shadow-primary-900/20
                     transition-colors duration-150">
                    {cargando ? "Guardando…" : "Guardar contraseña"}
                </button>
            </form>
        </div>
    );

    // Con la obligación pendiente se muestra SIN el armazón de navegación: el
    // menú invitaría a irse a otra pantalla, que es justo lo que se impide.
    if (debeCambiarPassword) {
        return (
            <div className="min-h-screen bg-superficie flex items-center
                      justify-center px-6 py-10">
                <div className="w-full max-w-sm bg-blanco rounded-3xl
                        border border-gray-200 px-6 sm:px-8 py-8
                        animate-fade-in-up">
                    {formulario}
                </div>
            </div>
        );
    }

    return <MainLayout>{formulario}</MainLayout>;
}
