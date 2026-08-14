// Anillo genérico de distribución (SVG puro): recibe un mapa
// etiqueta → conteo y asigna colores de la paleta del sistema.
// Se redibuja con transición cuando cambian los filtros.

interface Props {
    titulo: string;
    conteos: Record<string, number>;
    unidad?: string;
    vacio?: string;
}

import { PALETA, PISTA } from "./paleta";

const RADIO = 52;
const GROSOR = 16;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

interface Arco {
    etiqueta: string;
    valor: number;
    fraccion: number;
    offset: number;
    color: string;
}

export function AnilloConteos({ titulo, conteos, unidad = "registros", vacio }: Props) {
    const entradas = Object.entries(conteos)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 7);
    const total = Object.values(conteos).reduce((acc, v) => acc + v, 0);

    // Cada arco arranca donde terminó el anterior (suma acumulada sin
    // mutar variables externas al callback, para mantener el render puro)
    const { arcos } = entradas.reduce<{ arcos: Arco[]; acumulado: number }>(
        (estado, [etiqueta, valor], i) => {
            const fraccion = valor / total;
            return {
                arcos: [...estado.arcos, {
                    etiqueta, valor, fraccion,
                    offset: estado.acumulado, color: PALETA[i % PALETA.length],
                }],
                acumulado: estado.acumulado + fraccion,
            };
        },
        { arcos: [], acumulado: 0 },
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-extrabold tracking-tight text-gray-900 mb-4">
                {titulo}
            </h3>

            {total === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                    {vacio ?? "Sin datos en este período."}
                </p>
            ) : (
                <div className="flex items-center gap-6 flex-wrap">
                    <svg
                        viewBox="0 0 140 140"
                        className="w-36 h-36 shrink-0 -rotate-90"
                        role="img"
                        aria-label={`${total} ${unidad} en total`}
                    >
                        <circle
                            cx="70" cy="70" r={RADIO}
                            fill="none" stroke={PISTA} strokeWidth={GROSOR}
                        />
                        {arcos.map((a) => (
                            <circle
                                key={a.etiqueta}
                                cx="70" cy="70" r={RADIO}
                                fill="none"
                                stroke={a.color}
                                strokeWidth={GROSOR}
                                strokeDasharray={
                                    `${a.fraccion * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
                                strokeDashoffset={-a.offset * CIRCUNFERENCIA}
                                className="transition-[stroke-dasharray,stroke-dashoffset]
                                     duration-700 ease-salida"
                            />
                        ))}
                        <g transform="rotate(90 70 70)">
                            <text x="70" y="66" textAnchor="middle"
                                className="fill-gray-900 text-2xl font-extrabold">
                                {total}
                            </text>
                            <text x="70" y="84" textAnchor="middle"
                                className="fill-gray-400 text-[10px] font-semibold uppercase">
                                {unidad}
                            </text>
                        </g>
                    </svg>

                    <div className="flex-1 min-w-[180px] space-y-2">
                        {arcos.map((a) => (
                            <div key={a.etiqueta}
                                className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-2 text-sm
                                 text-gray-600 min-w-0">
                                    <span className="w-3 h-3 rounded-sm shrink-0"
                                        style={{ backgroundColor: a.color }} />
                                    <span className="truncate">{a.etiqueta}</span>
                                </span>
                                <span className="text-sm font-bold text-gray-800 tabular-nums shrink-0">
                                    {a.valor}
                                    <span className="text-xs font-medium text-gray-400 ml-1">
                                        ({Math.round(a.fraccion * 100)}%)
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
