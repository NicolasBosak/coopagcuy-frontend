import { useState } from "react";
import { ModalShell } from "../ui/ModalShell";
import type { PasswordTemporal } from "../../types/recuperacion";

interface Props {
    datos: PasswordTemporal;
    onClose: () => void;
    /**
     * Un restablecimiento cierra las sesiones abiertas del usuario; un alta no
     * tiene ninguna que cerrar. Sin esta distinción el modal le diría al
     * administrador que acaba de cerrar sesiones de una cuenta recién creada,
     * que es sencillamente falso.
     */
    sesionesRevocadas?: boolean;
}

/**
 * La contraseña temporal existe fuera del hash una sola vez, aquí. Si el
 * administrador cierra sin anotarla, no hay forma de recuperarla: hay que
 * generar otra con el botón "Restablecer" de la lista de usuarios.
 *
 * Vive en su propio archivo porque lo abren tres pantallas —alta de usuario,
 * restablecimiento desde la lista y resolución de una solicitud— y la tercera
 * copia es la que convierte un descuido en una divergencia.
 */
export function ModalPasswordTemporal({
    datos, onClose, sesionesRevocadas = false,
}: Props) {
    const [copiada, setCopiada] = useState(false);

    return (
        <ModalShell
            onClose={onClose}
            title="Contraseña temporal"
            subtitle={`Para ${datos.nombreCompleto} · ${datos.cedula}`}
            footer={
                <button
                    onClick={onClose}
                    className="w-full min-h-[48px] bg-primary-600
                     hover:bg-primary-700 text-white text-sm
                     font-semibold rounded-xl transition"
                >
                    Ya la anoté, cerrar
                </button>
            }
        >
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Díctasela por teléfono o entrégasela en persona.
                Al entrar, el sistema le pedirá crear una propia.
            </p>

            <div className="bg-superficie border border-gray-200 rounded-2xl
                      px-5 py-6 text-center">
                <p className="font-mono text-2xl font-bold tracking-wide
                      text-gray-900 select-all">
                    {datos.passwordTemporal}
                </p>
            </div>

            <button
                onClick={() => {
                    navigator.clipboard
                        ?.writeText(datos.passwordTemporal)
                        .then(() => setCopiada(true))
                        .catch(() => setCopiada(false));
                }}
                className="w-full mt-3 min-h-[44px] text-sm font-semibold
                   text-primary-600 hover:text-primary-800"
            >
                {copiada ? "✓ Copiada" : "Copiar"}
            </button>

            <div className="mt-5 bg-teja-50 border border-teja-100 rounded-xl
                      px-4 py-3">
                <p className="text-sm text-teja-700 leading-relaxed">
                    <strong>No se volverá a mostrar.</strong> Anótala antes de
                    cerrar esta ventana.
                    {sesionesRevocadas
                        && " Las sesiones abiertas de este usuario ya fueron cerradas."}
                </p>
            </div>
        </ModalShell>
    );
}
