interface Opcion<T extends string> {
    id: T;
    label: string;
}

interface Props<T extends string> {
    opciones: readonly Opcion<T>[];
    activo: T;
    onCambio: (id: T) => void;
}

/**
 * Control segmentado para elegir una vista entre varias.
 *
 * Estaba copiado en cada pantalla y cada copia se desviaba: en móvil los
 * botones quedaban en 32 px con 4 px de separación —por debajo de los 44 px
 * táctiles del RNF-201— y con siete opciones la tira se salía de la pantalla.
 *
 * Envuelve en vez de scrollear: una opción que no se ve es una opción que no
 * existe, y estas pantallas las usan operadoras con poca experiencia digital.
 * Desde sm vuelve a la píldora compacta, donde apunta un ratón.
 */
export function Segmentado<T extends string>({ opciones, activo, onCambio }: Props<T>) {
    return (
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 mb-5 sm:w-fit">
            {opciones.map(({ id, label }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onCambio(id)}
                    aria-pressed={activo === id}
                    className={`min-h-[44px] sm:min-h-0 px-4 py-2 rounded-lg
                        text-sm font-medium transition
                        ${activo === id
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
