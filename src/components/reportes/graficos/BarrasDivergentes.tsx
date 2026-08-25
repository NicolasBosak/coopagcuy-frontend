// Barras que pueden ir a los dos lados de un cero, en CSS puro.
//
// Es el gráfico del margen y no vale el de ganancias: aquí sumar SÍ es la
// definición del dato (ingreso − costo = margen), y el margen puede ser
// pérdida. El color sigue la misma regla que ya usa la celda de la tabla:
// cian cuando queda algo, rojo teja cuando se perdió.

export interface FilaDivergente {
    etiqueta: string;
    valor: number;
}

interface Props {
    titulo: string;
    filas: FilaDivergente[];
    maxFilas?: number;
    formato?: (v: number) => string;
    /** Aclaración bajo el gráfico, si el dato la necesita. */
    nota?: string;
}

export function BarrasDivergentes({
    titulo, filas, maxFilas = 8, formato = (v) => `${v}`, nota,
}: Props) {
    const visibles = filas.slice(0, maxFilas);

    // El eje solo se parte en dos si de verdad hay pérdidas en el período.
    // Reservar la mitad izquierda para números negativos que no existen
    // dejaría medio gráfico vacío y las barras a mitad de largo, que se lee
    // como si el margen fuera peor de lo que es.
    const hayPerdidas = visibles.some((f) => f.valor < 0);
    const maximo = Math.max(...visibles.map((f) => Math.abs(f.valor)), 1);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-sm font-extrabold tracking-tight text-gray-900">
                    {titulo}
                </h3>
                {hayPerdidas && (
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px]
                       font-medium text-gray-500">
                            <span className="w-2.5 h-2.5 rounded-sm bg-primary-600" />
                            Ganancia
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11px]
                       font-medium text-gray-500">
                            <span className="w-2.5 h-2.5 rounded-sm bg-teja-500" />
                            Pérdida
                        </span>
                    </div>
                )}
            </div>

            {visibles.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                    Sin datos en este período. Prueba con otras fechas.
                </p>
            ) : (
                <div className="space-y-2.5">
                    {visibles.map((f) => {
                        const ancho = (Math.abs(f.valor) / maximo) * 100;
                        const negativo = f.valor < 0;
                        const relleno = negativo ? "bg-teja-500" : "bg-primary-600";
                        return (
                            <div key={f.etiqueta} className="flex items-center gap-2"
                                role="img"
                                aria-label={`${f.etiqueta}: ${formato(f.valor)}`}>
                                <span className="w-[92px] shrink-0 text-[11px] font-semibold
                               text-gray-600 truncate capitalize">
                                    {f.etiqueta}
                                </span>

                                <div className="flex-1 flex items-stretch h-4">
                                    {hayPerdidas && (
                                        <>
                                            {/* Lado de las pérdidas: crece hacia la izquierda */}
                                            <div className="flex-1 flex justify-end
                                      bg-gray-100 rounded-l-sm overflow-hidden">
                                                {negativo && (
                                                    <div className={`${relleno} h-full
                                            transition-[width] duration-700 ease-salida`}
                                                        style={{ width: `${ancho}%` }} />
                                                )}
                                            </div>
                                            <span className="w-px bg-gray-400 shrink-0"
                                                aria-hidden="true" />
                                        </>
                                    )}
                                    <div className={`flex-1 bg-gray-100 overflow-hidden
                                ${hayPerdidas ? "rounded-r-sm" : "rounded-sm"}`}>
                                        {!negativo && (
                                            <div className={`${relleno} h-full
                                          transition-[width] duration-700 ease-salida`}
                                                style={{ width: `${ancho}%` }} />
                                        )}
                                    </div>
                                </div>

                                <span className={`w-[86px] shrink-0 text-right text-[11px]
                             font-bold tabular-nums
                             ${negativo ? "text-teja-700" : "text-primary-700"}`}>
                                    {formato(f.valor)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {nota && (
                <p className="text-[11px] text-gray-400 mt-4">{nota}</p>
            )}

            {filas.length > maxFilas && (
                <p className="text-[11px] text-gray-400 mt-2">
                    Se muestran los {maxFilas} primeros. La tabla de abajo tiene el
                    detalle completo.
                </p>
            )}
        </div>
    );
}
