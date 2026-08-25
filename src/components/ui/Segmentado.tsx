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
 *
 * NO lleva margen exterior. Lo llevaba (`mb-5`) y eso lo desalineaba en
 * Reportes: en los encabezados de Ganancias el control va junto al título
 * dentro de un `flex items-end`, que alinea los bordes inferiores de las
 * cajas — y la caja incluía sus 20 px de margen, así que los botones
 * quedaban visiblemente altos respecto del título de al lado. El espacio que
 * rodea a un componente lo decide quien lo coloca, no el componente.
 */
export function Segmentado<T extends string>({ opciones, activo, onCambio }: Props<T>) {
    return (
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 sm:w-fit">
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
