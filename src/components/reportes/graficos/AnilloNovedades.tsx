// Anillo de distribución de novedades por tipo, en SVG puro.
// Los arcos se redibujan con transición cuando cambian los filtros.

import { PALETA, INFORMATIVO, RECHAZADO, GRAVE, NEUTRO, PISTA } from "./paleta";
import { PESO_MAXIMO_GRAMOS } from "../../../domain/reglasRecepcion";

interface Props {
    conteos: Record<string, number>;
}

const TIPOS: Record<string, { nombre: string; color: string }> = {
    BajoPeso: { nombre: "Bajo peso", color: PALETA[1] },        // naranja
    OrejaDura: { nombre: "Oreja dura", color: PALETA[4] },       // oliva
    ColorNoConforme: { nombre: "Color no conforme", color: RECHAZADO },
    SinAyuno: { nombre: "Sin ayuno", color: PALETA[5] },        // cian claro
    // Azul, no naranja: el sobrepeso informa, no señala un problema con el
    // animal. Mismo criterio que el aviso de la pantalla de recepción.
    SobrePeso: { nombre: `Sobre peso (>${PESO_MAXIMO_GRAMOS}g)`, color: INFORMATIVO },
    SignosClinicos: { nombre: "Signos clínicos", color: GRAVE },
    Otro: { nombre: "Otro", color: NEUTRO },
};

const RADIO = 52;
const GROSOR = 16;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

interface Arco {
    tipo: string;
    valor: number;
    fraccion: number;
    offset: number;
}

export function AnilloNovedades({ conteos }: Props) {
    const entradas = Object.entries(conteos)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a);
    const total = entradas.reduce((acc, [, v]) => acc + v, 0);

    // Cada arco arranca donde terminó el anterior (suma acumulada sin
    // mutar variables externas al callback, para mantener el render puro)
    const { arcos } = entradas.reduce<{ arcos: Arco[]; acumulado: number }>(
        (estado, [tipo, valor]) => {
            const fraccion = valor / total;
            return {
                arcos: [...estado.arcos, {
                    tipo, valor, fraccion, offset: estado.acumulado,
                }],
                acumulado: estado.acumulado + fraccion,
            };
        },
        { arcos: [], acumulado: 0 },
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-extrabold tracking-tight text-gray-900 mb-4">
                Novedades por tipo
            </h3>

            {total === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                    Sin novedades en este período. ¡Buen trabajo!
                </p>
            ) : (
                <div className="flex items-center gap-6 flex-wrap">
                    <svg
                        viewBox="0 0 140 140"
                        className="w-36 h-36 shrink-0 -rotate-90"
                        role="img"
                        aria-label={`${total} novedades en total`}
                    >
                        <circle
                            cx="70" cy="70" r={RADIO}
                            fill="none" stroke={PISTA} strokeWidth={GROSOR}
                        />
                        {arcos.map((a) => (
                            <circle
                                key={a.tipo}
                                cx="70" cy="70" r={RADIO}
                                fill="none"
                                stroke={TIPOS[a.tipo]?.color ?? NEUTRO}
                                strokeWidth={GROSOR}
                                strokeDasharray={
                                    `${a.fraccion * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
                                strokeDashoffset={-a.offset * CIRCUNFERENCIA}
                                className="transition-[stroke-dasharray,stroke-dashoffset]
                                     duration-700 ease-salida"
                            />
                        ))}
                        {/* Total al centro (contrarrotado) */}
                        <g transform="rotate(90 70 70)">
                            <text x="70" y="66" textAnchor="middle"
                                className="fill-gray-900 text-2xl font-extrabold">
                                {total}
                            </text>
                            <text x="70" y="84" textAnchor="middle"
                                className="fill-gray-400 text-[10px] font-semibold uppercase">
                                novedades
                            </text>
                        </g>
                    </svg>

                    <div className="flex-1 min-w-[180px] space-y-2">
                        {arcos.map((a) => {
                            const info = TIPOS[a.tipo] ?? { nombre: a.tipo, color: NEUTRO };
                            return (
                                <div key={a.tipo}
                                    className="flex items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-2 text-sm
                                   text-gray-600">
                                        <span className="w-3 h-3 rounded-sm shrink-0"
                                            style={{ backgroundColor: info.color }} />
                                        {info.nombre}
                                    </span>
                                    <span className="text-sm font-bold text-gray-800 tabular-nums">
                                        {a.valor}
                                        <span className="text-xs font-medium text-gray-400 ml-1">
                                            ({Math.round(a.fraccion * 100)}%)
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
