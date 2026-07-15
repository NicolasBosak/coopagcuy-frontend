import { useEffect, useState } from "react";

/**
 * Fecha y hora del registro: se muestran reales y no se pueden editar.
 *
 * Va en vivo a propósito. Un valor fijo al abrir el formulario mentiría en
 * cuanto la operadora tarde unos minutos en llenarlo —y en recepción llena un
 * cuy a la vez—, así que al guardar mostraría una hora que ya no es. Al
 * tickear, lo que se ve coincide con lo que el servidor va a sellar.
 */
export function SelloDeTiempo({ etiqueta = "Fecha y hora" }: { etiqueta?: string }) {
    const [ahora, setAhora] = useState(() => new Date());

    useEffect(() => {
        // Cada 10 s: la precisión al segundo no aporta nada aquí y evita
        // repintar el formulario entero una vez por segundo en una tablet
        const id = setInterval(() => setAhora(new Date()), 10_000);
        return () => clearInterval(id);
    }, []);

    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                {etiqueta}
            </label>
            <div
                aria-readonly="true"
                className="w-full h-12 px-3 rounded-2xl border-2 border-gray-100
                   bg-gray-50 flex items-center justify-between gap-2"
            >
                <span className="text-sm font-semibold text-gray-700 tabular-nums">
                    {ahora.toLocaleDateString("es-EC", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                    })}
                    {" · "}
                    {ahora.toLocaleTimeString("es-EC", {
                        hour: "2-digit", minute: "2-digit", hour12: false,
                    })}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide
                         text-gray-400 shrink-0">
                    🔒 Automática
                </span>
            </div>
        </div>
    );
}
