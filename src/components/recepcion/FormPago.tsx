import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productorasApi } from "../../api/productoras";
import { pagosApi } from "../../api/pagos";
import { imprimirTicket } from "../../api/imprimirTicket";
import { useAuth } from "../../context/useAuth";
import { ModalShell } from "../ui/ModalShell";
import { SelloDeTiempo } from "../ui/SelloDeTiempo";
import type { RegistrarPagoRequest } from "../../types/productora";

interface Props {
    onClose: () => void;
}

// Registro digital de pago a productora (antes cuaderno manual)
export function FormPago({ onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const [form, setForm] = useState<RegistrarPagoRequest>({
        productoraId: 0,
        loteId: 0,
        montoUsd: 0,
        responsable: auth.nombreCompleto ?? "",
        observaciones: "",
    });
    const [error, setError] = useState<string | null>(null);

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
        mutationFn: () => pagosApi.registrar(form),
        onSuccess: async (pago) => {
            qc.invalidateQueries({ queryKey: ["pagos"] });
            // El lote recién pagado debe desaparecer del selector
            qc.invalidateQueries({ queryKey: ["lotes_pendientes_pago"] });
            // La productora está delante esperando su papel: imprimir aquí
            // ahorra que la operadora tenga que buscar la fila después.
            // Si falla la impresión el pago YA está registrado, así que no
            // se propaga el error ni se reintenta el pago: solo se avisa.
            // El modal se cierra de inmediato después de esto, así que el
            // aviso no puede depender de un estado que va a desmontarse;
            // por eso es un alert nativo, que se ve pase lo que pase.
            try {
                await imprimirTicket(pago.id);
            } catch {
                window.alert(
                    "El pago se registró, pero el ticket no se pudo imprimir.\n" +
                    "Usa el botón \"🧾 Ticket\" en la lista de pagos para reimprimirlo."
                );
            }
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
        if (form.loteId === 0) {
            setError("Selecciona el lote por el que se paga.");
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
                                loteId: 0,
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
                            Lote por el que se paga
                        </label>
                        <select
                            required
                            value={form.loteId}
                            onChange={(e) => setForm({
                                ...form, loteId: Number(e.target.value),
                            })}
                            disabled={form.productoraId === 0}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none
                         disabled:bg-gray-50 disabled:text-gray-400"
                        >
                            <option value={0}>Seleccionar lote…</option>
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
                        <SelloDeTiempo etiqueta="Fecha del pago" />
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide
                          text-gray-500 mb-2">
                            Forma de pago
                        </p>
                        {/* Un solo botón, siempre activo: desde el paso a
                            transferencia única no hay nada que elegir. Se
                            mantiene visible —y no como texto suelto— para que
                            la operadora vea con qué se va a registrar. */}
                        <div className="h-12 rounded-xl border-2 border-primary-600
                            bg-primary-50 text-primary-800 text-sm font-semibold
                            flex items-center justify-center gap-2">
                            <span aria-hidden="true">🏦</span>
                            Transferencia bancaria
                        </div>
                    </div>

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
