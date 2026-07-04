// Gráfico de barras apiladas horizontales, hecho en CSS puro (sin librerías).
// Cada fila muestra la composición aceptado / con novedad / rechazado de una
// productora o CAT. Las barras se deslizan a su nuevo tamaño cuando cambian
// los filtros, gracias a la transición de width.

export interface FilaBarras {
    etiqueta: string;
    sublabel?: string;
    aceptados: number;
    conNovedad: number;
    rechazados: number;
}

interface Props {
    titulo: string;
    filas: FilaBarras[];
    /** Máximo de filas visibles (las demás se agrupan en el total) */
    maxFilas?: number;
    /** Qué representa cada unidad de la barra: "lotes" o "cuyes" */
    unidad?: string;
}

// Mismo semáforo del resto del sistema: verde / bayo / teja
const SEGMENTOS = [
    { key: "aceptados" as const, color: "bg-primary-500", nombre: "Aceptados" },
    { key: "conNovedad" as const, color: "bg-bayo-500", nombre: "Con novedad" },
    { key: "rechazados" as const, color: "bg-teja-500", nombre: "Rechazados" },
];

export function BarrasCalidad({ titulo, filas, maxFilas = 8, unidad = "lotes" }: Props) {
    const visibles = filas.slice(0, maxFilas);
    const maxTotal = Math.max(
        ...visibles.map((f) => f.aceptados + f.conNovedad + f.rechazados), 1);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-sm font-extrabold tracking-tight text-gray-900">
                    {titulo}
                </h3>
                <div className="flex items-center gap-3">
                    {SEGMENTOS.map((s) => (
                        <span key={s.key}
                            className="inline-flex items-center gap-1.5 text-[11px]
                         font-medium text-gray-500">
                            <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                            {s.nombre}
                        </span>
                    ))}
                </div>
            </div>

            {visibles.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                    Sin datos en este período. Prueba con otras fechas.
                </p>
            ) : (
                <div className="space-y-3">
                    {visibles.map((f) => {
                        const total = f.aceptados + f.conNovedad + f.rechazados;
                        return (
                            <div key={f.etiqueta}>
                                <div className="flex items-baseline justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-700
                                   truncate max-w-[60%]">
                                        {f.etiqueta}
                                        {f.sublabel && (
                                            <span className="text-gray-400 font-normal">
                                                {" "}· {f.sublabel}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs font-bold text-gray-500 tabular-nums">
                                        {total} {total === 1
                                            ? unidad.replace(/s$/, "") : unidad}
                                    </span>
                                </div>
                                <div className="flex h-5 rounded-md overflow-hidden bg-gray-100"
                                    role="img"
                                    aria-label={`${f.etiqueta}: ${f.aceptados} aceptados,
                     ${f.conNovedad} con novedad, ${f.rechazados} rechazados`}>
                                    {SEGMENTOS.map((s) => {
                                        const valor = f[s.key];
                                        const ancho = (valor / maxTotal) * 100;
                                        return (
                                            <div
                                                key={s.key}
                                                className={`${s.color} h-full
                                    transition-all duration-700 ease-out
                                    flex items-center justify-center`}
                                                style={{ width: `${ancho}%` }}
                                                title={`${s.nombre}: ${valor}`}
                                            >
                                                {ancho > 8 && (
                                                    <span className="text-[10px] font-bold text-white/95">
                                                        {valor}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {filas.length > maxFilas && (
                <p className="text-[11px] text-gray-400 mt-3">
                    Se muestran las {maxFilas} con más {unidad}. La tabla de
                    abajo tiene el detalle completo.
                </p>
            )}
        </div>
    );
}
