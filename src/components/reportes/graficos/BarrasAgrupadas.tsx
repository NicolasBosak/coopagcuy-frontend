// Barras agrupadas horizontales, en CSS puro (sin librerías), igual que el
// resto de gráficos del sistema.
//
// AGRUPADAS Y NO APILADAS, y esto no es una preferencia estética: en el
// reporte de ganancias las tres cifras —cobrado local, pactado a cuotas y
// pagado por planta— NUNCA se suman entre sí. Apilar es sumar, y el largo
// total de una barra apilada sería exactamente la cifra que el sistema
// entero se cuida de no producir (ver la nota de SumarPorCanal en el API y
// los comentarios de la pestaña Ganancias). Una barra por serie compara sin
// totalizar.
//
// Por eso no se reutiliza BarrasCalidad: además de ser apilado, su semántica
// es el semáforo aceptado / con novedad / rechazado, que es otra cosa.

export interface SerieBarras {
    key: string;
    nombre: string;
    /** Clase Tailwind de fondo, p. ej. "bg-primary-600" */
    color: string;
}

export interface FilaAgrupada {
    etiqueta: string;
    sublabel?: string;
    valores: Record<string, number>;
}

interface Props {
    titulo: string;
    series: SerieBarras[];
    filas: FilaAgrupada[];
    /** Máximo de filas visibles; el resto queda solo en la tabla de abajo. */
    maxFilas?: number;
    /** Cómo se escribe un valor. Por defecto, el número tal cual. */
    formato?: (v: number) => string;
}

export function BarrasAgrupadas({
    titulo, series, filas, maxFilas = 8, formato = (v) => `${v}`,
}: Props) {
    const visibles = filas.slice(0, maxFilas);

    // Escala común a TODAS las filas y series: si cada fila se normalizara a
    // su propio máximo, dos barras del mismo largo significarían cantidades
    // distintas y la comparación entre productoras sería falsa.
    const maximo = Math.max(
        ...visibles.flatMap((f) => series.map((s) => f.valores[s.key] ?? 0)),
        1,
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-sm font-extrabold tracking-tight text-gray-900">
                    {titulo}
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                    {series.map((s) => (
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
                <div className="space-y-4">
                    {visibles.map((f) => (
                        <div key={f.etiqueta}>
                            <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                <span className="text-xs font-semibold text-gray-700
                               truncate">
                                    {f.etiqueta}
                                    {f.sublabel && (
                                        <span className="text-gray-400 font-normal">
                                            {" "}· {f.sublabel}
                                        </span>
                                    )}
                                </span>
                            </div>

                            <div className="space-y-1">
                                {series.map((s) => {
                                    const valor = f.valores[s.key] ?? 0;
                                    const ancho = (valor / maximo) * 100;
                                    return (
                                        <div key={s.key}
                                            className="flex items-center gap-2"
                                            role="img"
                                            aria-label={`${f.etiqueta}, ${s.nombre}: ${formato(valor)}`}
                                        >
                                            <span className="w-[88px] shrink-0 text-[11px]
                                     text-gray-500 truncate hidden xs:block">
                                                {s.nombre}
                                            </span>
                                            <div className="flex-1 h-3 rounded-sm bg-gray-100
                                      overflow-hidden">
                                                <div
                                                    className={`h-full ${s.color} rounded-sm
                                          transition-[width] duration-700 ease-salida`}
                                                    style={{ width: `${ancho}%` }}
                                                />
                                            </div>
                                            <span className="w-[86px] shrink-0 text-right text-[11px]
                                     font-bold text-gray-700 tabular-nums">
                                                {formato(valor)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filas.length > maxFilas && (
                <p className="text-[11px] text-gray-400 mt-4">
                    Se muestran las {maxFilas} primeras. La tabla de abajo tiene el
                    detalle completo.
                </p>
            )}
        </div>
    );
}
