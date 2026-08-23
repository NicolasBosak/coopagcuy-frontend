import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pagosApi } from "../../api/pagos";
import { useAuth } from "../../context/useAuth";
import { ModalShell } from "../ui/ModalShell";
import type { Lote } from "../../types/recepcion";
import type { MetodoVentaLocal } from "../../types/productora";

interface Props {
    lote: Lote;
    onClose: () => void;
}

const METODOS: { value: MetodoVentaLocal; label: string; icono: string }[] = [
    { value: "Efectivo", label: "Efectivo", icono: "💵" },
    { value: "Transferencia", label: "Transferencia", icono: "🏦" },
    { value: "Cuotas", label: "Cuotas", icono: "📆" },
];

// Venta directa en la comunidad: la CAT marca qué cuyes concretos vende, no
// cuántos — la guía de movilización necesita después decir exactamente
// cuáles se quedaron. Un animal con novedad (bajo peso, etc.) se puede
// vender igual: es justo el candidato natural a colocar en la comunidad,
// aunque la planta lo hubiera rechazado.
export function FormVentaLocal({ lote, onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();

    const productoras = lote.productoras;
    const [productoraId, setProductoraId] = useState<number>(
        productoras.length === 1 ? productoras[0].productoraId : 0
    );
    const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
    const [montoUsd, setMontoUsd] = useState<number>(0);
    const [metodoPago, setMetodoPago] = useState<MetodoVentaLocal>("Efectivo");
    const [numeroDias, setNumeroDias] = useState<number>(0);
    const [valorPorDia, setValorPorDia] = useState<number>(0);
    const [responsable, setResponsable] = useState(auth.nombreCompleto ?? "");
    const [observaciones, setObservaciones] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Cuyes de esa productora en ese lote que todavía se pueden vender: se
    // cargan con useQuery + enabled (nunca desde un useEffect) para no
    // disparar la petición fuera del ciclo de render de React Query.
    const { data: cuyes = [], isLoading: cargandoCuyes } = useQuery({
        queryKey: ["cuyes_disponibles", lote.id, productoraId],
        queryFn: () => pagosApi.cuyesDisponibles(lote.id, productoraId),
        enabled: productoraId > 0,
    });

    const faltaAcuerdoCuotas = metodoPago === "Cuotas"
        && (!(numeroDias > 0) || !(valorPorDia > 0));
    const puedeGuardar = seleccionados.size > 0 && montoUsd > 0 && !faltaAcuerdoCuotas;

    const mutation = useMutation({
        mutationFn: () => pagosApi.registrarVentaLocal({
            productoraId,
            loteId: lote.id,
            cuyRegistroIds: Array.from(seleccionados),
            montoUsd,
            metodoPago,
            ...(metodoPago === "Cuotas"
                ? { numeroDias, valorPorDia }
                : {}),
            responsable,
            observaciones: observaciones.trim() || undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pagos"] });
            // El cuy recién vendido ya no debe ofrecerse en otra venta local
            qc.invalidateQueries({ queryKey: ["cuyes_disponibles"] });
            qc.invalidateQueries({ queryKey: ["lotes_pendientes_pago"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje ?? "No se pudo registrar la venta local.");
        },
    });

    const alternarCuy = (id: number) => {
        setSeleccionados((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const seleccionarTodos = () => {
        setSeleccionados(new Set(cuyes.map((c) => c.cuyRegistroId)));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (productoraId === 0) {
            setError("Selecciona la productora que vende.");
            return;
        }
        if (seleccionados.size === 0) {
            setError("Marca al menos un cuy para vender.");
            return;
        }
        if (montoUsd <= 0) {
            setError("El monto debe ser mayor a cero.");
            return;
        }
        if (faltaAcuerdoCuotas) {
            setError("Completa los días y el valor por día del acuerdo de cuotas.");
            return;
        }
        mutation.mutate();
    };

    return (
        <ModalShell
            onClose={onClose}
            title="Venta local"
            subtitle={lote.codigoLote}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-venta-local"
                        disabled={!puedeGuardar || mutation.isPending}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Registrar venta"}
                    </button>
                </div>
            }
        >
            <form id="form-venta-local" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Productora que vende
                    </label>
                    <select
                        required
                        value={productoraId}
                        onChange={(e) => {
                            setProductoraId(Number(e.target.value));
                            setSeleccionados(new Set());
                        }}
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                    >
                        <option value={0}>Seleccionar productora…</option>
                        {productoras.map((p) => (
                            <option key={p.productoraId} value={p.productoraId}>
                                {p.nombre} — {p.comunidad}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500">
                            Cuyes que vende
                        </label>
                        <button type="button" onClick={seleccionarTodos}
                            disabled={cuyes.length === 0}
                            className="h-12 px-4 rounded-xl text-xs font-bold
                         text-primary-700 hover:bg-primary-50
                         disabled:text-gray-300 transition">
                            Seleccionar todos
                        </button>
                    </div>

                    {productoraId === 0 && (
                        <p className="text-xs text-gray-400">
                            Selecciona primero la productora.
                        </p>
                    )}
                    {productoraId > 0 && cargandoCuyes && (
                        <p className="text-xs text-gray-400">Cargando cuyes…</p>
                    )}
                    {productoraId > 0 && !cargandoCuyes && cuyes.length === 0 && (
                        <p className="text-xs text-gray-400">
                            Esta productora no tiene cuyes disponibles en este lote.
                        </p>
                    )}

                    <div className="space-y-2">
                        {cuyes.map((c) => {
                            const marcado = seleccionados.has(c.cuyRegistroId);
                            // Con novedad y todo se puede vender: la casilla nunca se
                            // deshabilita, solo se distingue visualmente.
                            const conNovedad = c.motivoNovedad !== null;
                            return (
                                <label key={c.cuyRegistroId}
                                    className={`flex items-center gap-3 min-h-[48px] px-3 py-2
                                       rounded-xl border-2 cursor-pointer transition
                                       ${marcado
                                            ? "border-primary-500 bg-primary-50"
                                            : conNovedad
                                                ? "border-bayo-200 bg-bayo-50"
                                                : "border-gray-200 bg-white hover:bg-gray-50"}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={marcado}
                                        onChange={() => alternarCuy(c.cuyRegistroId)}
                                        className="w-5 h-5 accent-primary-600 shrink-0"
                                    />
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-gray-100
                                 flex items-center justify-center text-xs
                                 font-bold text-gray-600">
                                        {c.numeroEnLote}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800 shrink-0">
                                        {Math.round(c.pesoGramos)} g
                                    </span>
                                    {conNovedad && (
                                        <span className="text-xs font-semibold text-bayo-700 min-w-0">
                                            ⚠ {c.motivoNovedad}
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Monto (USD)
                        </label>
                        <input
                            type="number" min={0.01} step={0.01} required
                            inputMode="decimal"
                            value={montoUsd || ""}
                            onChange={(e) => setMontoUsd(Number(e.target.value))}
                            placeholder="0.00"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm font-bold focus:border-primary-500
                           focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <p className="text-xs font-bold uppercase tracking-wide
                          text-gray-500 mb-2">
                        Forma de pago
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {METODOS.map((m) => (
                            <button key={m.value} type="button"
                                onClick={() => setMetodoPago(m.value)}
                                className={`h-12 rounded-xl text-xs font-bold transition
                           active:scale-[0.97]
                           ${metodoPago === m.value
                                        ? "bg-primary-600 text-white"
                                        : "bg-gray-100 text-gray-600"}`}
                            >
                                <span className="block text-sm">{m.icono}</span>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {metodoPago === "Cuotas" && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                                text-gray-500 mb-1">
                                Número de días
                            </label>
                            <input
                                type="number" min={1} step={1} required
                                inputMode="numeric"
                                value={numeroDias || ""}
                                onChange={(e) => setNumeroDias(Number(e.target.value))}
                                placeholder="0"
                                className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                             text-sm font-bold focus:border-primary-500
                             focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                                text-gray-500 mb-1">
                                Valor por día (USD)
                            </label>
                            <input
                                type="number" min={0.01} step={0.01} required
                                inputMode="decimal"
                                value={valorPorDia || ""}
                                onChange={(e) => setValorPorDia(Number(e.target.value))}
                                placeholder="0.00"
                                className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                             text-sm font-bold focus:border-primary-500
                             focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Responsable de la venta
                    </label>
                    <input
                        type="text" required
                        value={responsable}
                        onChange={(e) => setResponsable(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Observaciones (opcional)
                    </label>
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none
                         resize-none"
                    />
                </div>

                {error && (
                    <div className="bg-teja-50 border border-teja-100 rounded-xl
                        px-3 py-2 text-sm text-teja-700">
                        {error}
                    </div>
                )}
            </form>
        </ModalShell>
    );
}
