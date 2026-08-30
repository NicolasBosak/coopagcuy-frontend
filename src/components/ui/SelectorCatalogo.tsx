interface Opcion {
    value: string;
    label: string;
}

interface Props {
    label: string;
    value: string;
    onChange: (valor: string) => void;
    opciones: Opcion[];
    cargando: boolean;
    error: boolean;
    onReintentar: () => void;
    disabled?: boolean;
}

/**
 * Selector para un catálogo que viene del API (cantón, centro de acopio…),
 * con sus tres estados posibles: cargando, cargado y "no se pudo cargar".
 *
 * TanStack Query deja `isLoading` en `false` tanto cuando la consulta
 * terminó como cuando falló o quedó pausada sin red: sin distinguir el
 * tercer estado, un fallo se ve idéntico a un catálogo vacío, y el
 * `required` del select deja al usuario sin poder avanzar y sin saber por
 * qué. Por eso el error reemplaza al select por un aviso con botón de
 * reintento, en vez de dejar un desplegable vacío detrás de un
 * marcador de posición.
 */
export function SelectorCatalogo({
    label, value, onChange, opciones, cargando, error, onReintentar, disabled,
}: Props) {
    return (
        <div>
            {label && (
                <label className="block text-xs font-bold uppercase tracking-wide
                    text-gray-500 mb-1">
                    {label}
                </label>
            )}
            {error ? (
                <div className="rounded-xl border-2 border-teja-100 bg-teja-50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-teja-700">
                        No se pudo cargar el catálogo.
                    </p>
                    <p className="mt-0.5 text-xs text-teja-600">
                        Revisa la conexión con el servidor e intenta de nuevo.
                    </p>
                    <button
                        type="button"
                        onClick={onReintentar}
                        className="mt-1.5 text-xs font-bold text-teja-700
                       underline underline-offset-2"
                    >
                        Reintentar
                    </button>
                </div>
            ) : (
                <select
                    required
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none
                       disabled:bg-gray-50 disabled:text-gray-400"
                >
                    <option value="" disabled>
                        {cargando ? "Cargando…" : "Seleccionar…"}
                    </option>
                    {opciones.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            )}
        </div>
    );
}
