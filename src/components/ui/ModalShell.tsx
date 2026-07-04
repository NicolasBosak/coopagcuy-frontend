import type { ReactNode } from "react";

interface Props {
    onClose: () => void;
    children: ReactNode;          // cuerpo desplazable
    title?: string;
    subtitle?: string;
    /** Encabezado propio (sustituye a title/subtitle), ej. barra de pasos */
    header?: ReactNode;
    /** Pie fijo, típicamente los botones de acción */
    footer?: ReactNode;
    /** Ancho máximo en escritorio (clase max-w-*) */
    maxWidth?: string;
    /** Fondo del cuerpo: blanco para formularios, crema para asistentes */
    tone?: "white" | "crema";
}

// Contenedor común de ventanas modales. En móvil se comporta como hoja
// inferior (más fácil de alcanzar con el pulgar); en pantallas grandes es
// una tarjeta centrada. El cuerpo desplaza solo, y el pie queda fijo para
// que los botones nunca queden fuera de pantalla aunque haya muchos datos.
export function ModalShell({
    onClose, children, title, subtitle, header, footer,
    maxWidth = "max-w-lg", tone = "white",
}: Props) {
    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center
                 justify-center p-0 sm:p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full ${maxWidth} flex flex-col
                    max-h-[92vh] sm:max-h-[88vh]
                    rounded-t-3xl sm:rounded-3xl shadow-2xl
                    animate-sheet-up sm:animate-fade-in-up
                    ${tone === "crema" ? "bg-crema" : "bg-white"}`}
            >
                {/* Encabezado */}
                {header ?? (
                    <div className="shrink-0 flex items-start justify-between gap-3
                          px-5 sm:px-6 py-4 border-b border-gray-100 bg-white
                          rounded-t-3xl">
                        <div>
                            {title && (
                                <h2 className="text-lg font-extrabold tracking-tight
                               text-gray-900">
                                    {title}
                                </h2>
                            )}
                            {subtitle && (
                                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="w-11 h-11 -mr-2 -mt-1 shrink-0 flex items-center
                         justify-center text-gray-400 hover:text-gray-700 text-2xl"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Cuerpo desplazable */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
                    {children}
                </div>

                {/* Pie fijo */}
                {footer && (
                    <div className="shrink-0 border-t border-gray-100 bg-white
                          px-5 sm:px-6 py-4 rounded-b-3xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
