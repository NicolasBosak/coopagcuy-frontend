import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productorasApi, pagosApi } from "../../api/productoras";
import { useAuth } from "../../context/AuthContext";
import { ModalShell } from "../ui/ModalShell";
import type { RegistrarPagoRequest } from "../../types/productora";

interface Props {
    onClose: () => void;
}

const METODOS: { value: string; label: string }[] = [
    { value: "Contado", label: "💵 Efectivo al contado" },
    { value: "Credito", label: "🧾 Pago a crédito" },
];

// Registro digital de pago a productora (antes cuaderno manual)
export function FormPago({ onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const [form, setForm] = useState<RegistrarPagoRequest>({
        productoraId: 0,
        loteId: undefined,
        montoUsd: 0,
        metodoPago: "Contado",
        numeroDias: 2,
        responsable: auth.nombreCompleto ?? "",
        observaciones: "",
    });
    const [error, setError] = useState<string | null>(null);

    const esCredito = form.metodoPago === "Credito";
    // Valor de cada día: se muestra en vivo; el backend lo recalcula
    const valorPorDia = esCredito && form.numeroDias && form.montoUsd > 0
        ? form.montoUsd / form.numeroDias
        : 0;

    const { data: productoras = [] } = useQuery({
        queryKey: ["productoras"],
        queryFn: () => productorasApi.listar(),
    });

    // Solo lo que se le debe a esta productora: el servidor ya descarta los
    // lotes que ella tiene pagados y resuelve las jaulas compartidas
    const { data: lotesPendientes = [], isLoading: cargandoLotes } = useQuery({
        queryKey: ["lotes_pendientes_pago", form.productoraId],
        queryFn: () => pagosApi.lotesPendientes(form.productoraId),
        enabled: form.productoraId > 0,
    });

    const mutation = useMutation({
        mutationFn: () => pagosApi.registrar({
            ...form,
            numeroDias: esCredito ? form.numeroDias : undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pagos"] });
            // El lote recién pagado debe desaparecer del selector
            qc.invalidateQueries({ queryKey: ["lotes_pendientes_pago"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje ?? "No se pudo registrar el pago.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (form.productoraId === 0) {
            setError("Selecciona la productora que recibe el pago.");
            return;
        }
        if (form.montoUsd <= 0) {
            setError("El monto debe ser mayor a cero.");
            return;
        }
        mutation.mutate();
    };

    return (
        <ModalShell
            onClose={onClose}
            title="Registrar pago"
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-pago"
                        disabled={mutation.isPending}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Registrar pago"}
                    </button>
                </div>
            }
        >
                <form id="form-pago" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Productora que recibe el pago
                        </label>
                        <select
                            required
                            value={form.productoraId}
                            onChange={(e) => setForm({
                                ...form,
                                productoraId: Number(e.target.value),
                                loteId: undefined,
                            })}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                        >
                            <option value={0}>Seleccionar productora…</option>
                            {productoras.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nombreCompleto} — {p.comunidad}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Lote pendiente de pago (opcional)
                        </label>
                        <select
                            value={form.loteId ?? 0}
                            onChange={(e) => setForm({
                                ...form,
                                loteId: Number(e.target.value) || undefined,
                            })}
                            disabled={form.productoraId === 0}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none
                         disabled:bg-gray-50 disabled:text-gray-400"
                        >
                            <option value={0}>Sin lote específico</option>
                            {/* Solo lo que se le debe: el lote ya pagado no
                                aparece. La cantidad es su aporte a la jaula,
                                no el total, porque la jaula puede ser de varias. */}
                            {lotesPendientes.map((l) => (
                                <option key={l.loteId} value={l.loteId}>
                                    {l.codigoLote} ({l.cuyesEntregados} cuyes suyos)
                                </option>
                            ))}
                        </select>
                        {form.productoraId > 0 && !cargandoLotes
                            && lotesPendientes.length === 0 && (
                                <p className="mt-1 text-xs text-gray-400">
                                    Esta productora no tiene lotes pendientes de pago.
                                </p>
                            )}
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
                                value={form.montoUsd || ""}
                                onChange={(e) => setForm({
                                    ...form, montoUsd: Number(e.target.value)
                                })}
                                placeholder="0.00"
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm font-bold focus:border-primary-500
                           focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                                Fecha del pago
                            </label>
                            <div className="w-full h-11 px-3 rounded-xl border-2 border-gray-100
                                    bg-gray-50 text-sm text-gray-500 flex items-center">
                                Se registra automáticamente
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide
                          text-gray-500 mb-2">
                            ¿Cómo se pagó?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {METODOS.map((m) => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, metodoPago: m.value })}
                                    className={`h-12 rounded-xl border-2 text-sm font-semibold
                              transition active:scale-[0.97]
                              ${form.metodoPago === m.value
                                            ? "border-primary-600 bg-primary-50 text-primary-800"
                                            : "border-gray-200 bg-white text-gray-600"}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Diferido en días: solo para pago a crédito */}
                    {esCredito && (
                        <div className="grid grid-cols-2 gap-3 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide
                                  text-gray-500 mb-1">
                                    ¿En cuántos días?
                                </label>
                                <select
                                    value={form.numeroDias ?? 2}
                                    onChange={(e) => setForm({
                                        ...form, numeroDias: Number(e.target.value),
                                    })}
                                    className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                               text-sm focus:border-primary-500 focus:outline-none"
                                >
                                    {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                                        <option key={n} value={n}>{n} días</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide
                                  text-gray-500 mb-1">
                                    Valor por día
                                </label>
                                <div className="h-11 px-3 rounded-xl border-2 border-primary-100
                                    bg-primary-50 flex items-center text-base font-bold
                                    text-primary-800">
                                    {valorPorDia > 0
                                        ? `$${valorPorDia.toFixed(2)}`
                                        : "—"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Responsable del pago
                        </label>
                        <input
                            type="text" required
                            value={form.responsable}
                            onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
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
