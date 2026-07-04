import { useEffect, useRef, useState } from "react";

interface StatCardProps {
    label: string;
    value: string | number;
    sublabel?: string;
    color?: "green" | "yellow" | "red" | "blue" | "gray";
    /** Retraso de aparición en ms para escalonar la animación */
    delay?: number;
}

const colorMap = {
    green: "bg-primary-50 border-primary-100 text-primary-700",
    yellow: "bg-bayo-50 border-bayo-100 text-bayo-700",
    red: "bg-teja-50 border-teja-100 text-teja-700",
    blue: "bg-white border-gray-200 text-gray-800",
    gray: "bg-white border-gray-200 text-gray-700",
};

// Contador animado: sube desde 0 hasta el valor real
function useContador(destino: number, duracionMs = 700) {
    const [valor, setValor] = useState(0);
    const ref = useRef<number | null>(null);

    useEffect(() => {
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion || destino === 0) {
            setValor(destino);
            return;
        }

        const inicio = performance.now();
        const tick = (ahora: number) => {
            const progreso = Math.min((ahora - inicio) / duracionMs, 1);
            // easing suave de salida
            const eased = 1 - Math.pow(1 - progreso, 3);
            setValor(Math.round(destino * eased));
            if (progreso < 1) ref.current = requestAnimationFrame(tick);
        };
        ref.current = requestAnimationFrame(tick);
        return () => {
            if (ref.current) cancelAnimationFrame(ref.current);
        };
    }, [destino, duracionMs]);

    return valor;
}

export function StatCard({
    label, value, sublabel, color = "gray", delay = 0
}: StatCardProps) {
    const esNumero = typeof value === "number";
    const contador = useContador(esNumero ? value : 0);

    return (
        <div
            className={`rounded-2xl border p-5 transition-transform
                  hover:-translate-y-0.5 hover:shadow-sm
                  animate-fade-in-up ${colorMap[color]}`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                {label}
            </p>
            <p className="text-3xl font-extrabold tracking-tight mt-1">
                {esNumero ? contador.toLocaleString("es-EC") : value}
            </p>
            {sublabel && (
                <p className="text-xs mt-1 opacity-60">{sublabel}</p>
            )}
        </div>
    );
}
