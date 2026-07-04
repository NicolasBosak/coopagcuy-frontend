import { CENTROS_ACOPIO, type CentroAcopio } from "../../types/productora";

interface Props {
    desde: string;
    hasta: string;
    cat: CentroAcopio | "";
    onDesdeChange: (v: string) => void;
    onHastaChange: (v: string) => void;
    onCatChange: (v: CentroAcopio | "") => void;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

// Rangos rápidos de un toque: el más usado primero
const PRESETS: { label: string; rango: () => [string, string] }[] = [
    {
        label: "Este mes",
        rango: () => {
            const h = new Date();
            return [fmt(new Date(h.getFullYear(), h.getMonth(), 1)), fmt(h)];
        },
    },
    {
        label: "Últimos 15 días", // ciclo de recepción por comunidad — RF-212
        rango: () => {
            const h = new Date();
            const d = new Date(h);
            d.setDate(d.getDate() - 15);
            return [fmt(d), fmt(h)];
        },
    },
    {
        label: "Últimos 30 días",
        rango: () => {
            const h = new Date();
            const d = new Date(h);
            d.setDate(d.getDate() - 30);
            return [fmt(d), fmt(h)];
        },
    },
    {
        label: "Este año",
        rango: () => {
            const h = new Date();
            return [fmt(new Date(h.getFullYear(), 0, 1)), fmt(h)];
        },
    },
];

export function FiltrosPeriodo({
    desde, hasta, cat, onDesdeChange, onHastaChange, onCatChange
}: Props) {
    const aplicarPreset = (rango: [string, string]) => {
        onDesdeChange(rango[0]);
        onHastaChange(rango[1]);
    };

    const presetActivo = (rango: [string, string]) =>
        desde === rango[0] && hasta === rango[1];

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            {/* Rangos rápidos */}
            <div className="flex flex-wrap gap-2">
                {PRESETS.map(({ label, rango }) => {
                    const r = rango();
                    const activo = presetActivo(r);
                    return (
                        <button
                            key={label}
                            type="button"
                            onClick={() => aplicarPreset(r)}
                            className={`h-9 px-3.5 rounded-full text-xs font-semibold
                          transition-colors
                          ${activo
                                    ? "bg-primary-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700"}`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Rango manual + CAT */}
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Desde
                    </label>
                    <input
                        type="date"
                        value={desde}
                        onChange={(e) => onDesdeChange(e.target.value)}
                        className="h-10 px-3 border-2 border-gray-200 rounded-xl text-sm
                       focus:border-primary-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={hasta}
                        onChange={(e) => onHastaChange(e.target.value)}
                        className="h-10 px-3 border-2 border-gray-200 rounded-xl text-sm
                       focus:border-primary-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Centro de acopio
                    </label>
                    <select
                        value={cat}
                        onChange={(e) => onCatChange(e.target.value as CentroAcopio | "")}
                        className="h-10 px-3 border-2 border-gray-200 rounded-xl text-sm
                       focus:border-primary-500 focus:outline-none"
                    >
                        <option value="">Todos</option>
                        {CENTROS_ACOPIO.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
