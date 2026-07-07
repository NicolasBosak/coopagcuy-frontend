import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productorasApi, pagosApi } from "../../api/productoras";
import { recepcionApi } from "../../api/recepcion";
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
    const hoy = new Date().toISOString().slice(0, 16);

    const [form, setForm] = useState<RegistrarPagoRequest>({
        productoraId: 0,
        loteId: undefined,
        montoUsd: 0,
        fechaPago: hoy,
        metodoPago: "Contado",
        numeroLetras: 2,
        responsable: auth.nombreCompleto ?? "",
        observaciones: "",
    });
    const [error, setError] = useState<string | null>(null);

    const esCredito = form.metodoPago === "Credito";
    // Valor de cada letra: se muestra en vivo; el backend lo recalcula
    const valorPorLetra = esCredito && form.numeroLetras && form.montoUsd > 0
        ? form.montoUsd / form.numeroLetras
        : 0;

    const { data: productoras = [] } = useQuery({
        queryKey: ["productoras"],
        queryFn: () => productorasApi.listar(),
    });

    const { data: lotes = [] } = useQuery({
        queryKey: ["lotes"],
        queryFn: () => recepcionApi.listarLotes(),
    });

    // Solo lotes de la productora elegida
    const lotesDeProductora = lotes.filter(
        (l) => l.productoraId === form.productoraId);

    const mutation = useMutation({
        mutationFn: () => pagosApi.registrar({
            ...form,
            numeroLetras: esCredito ? form.numeroLetras : undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pagos"] });
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
                            Lote relacionado (opcional)
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
                            {lotesDeProductora.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.codigoLote} ({l.cantidadAnimales} cuyes)
                                </option>
                            ))}
                        </select>
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
                            <input
                                type="datetime-local" required
                                value={form.fechaPago}
                                onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                            />
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

                    {/* Diferido en letras: solo para pago a crédito */}
                    {esCredito && (
                        <div className="grid grid-cols-2 gap-3 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide
                                  text-gray-500 mb-1">
                                    ¿En cuántas letras?
                                </label>
                                <select
                                    value={form.numeroLetras ?? 2}
                                    onChange={(e) => setForm({
                                        ...form, numeroLetras: Number(e.target.value),
                                    })}
                                    className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                               text-sm focus:border-primary-500 focus:outline-none"
                                >
                                    {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                                        <option key={n} value={n}>{n} letras</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide
                                  text-gray-500 mb-1">
                                    Valor por letra
                                </label>
                                <div className="h-11 px-3 rounded-xl border-2 border-primary-100
                                    bg-primary-50 flex items-center text-base font-bold
                                    text-primary-800">
                                    {valorPorLetra > 0
                                        ? `$${valorPorLetra.toFixed(2)}`
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
