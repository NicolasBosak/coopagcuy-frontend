import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recepcionApi } from "../../api/recepcion";
import { useAuth } from "../../context/AuthContext";
import { ModalShell } from "../ui/ModalShell";
import type { RegistrarMovilizacionRequest, Lote } from "../../types/recepcion";

interface Props {
    lote: Lote;
    onClose: () => void;
}

// Forrajes comunes en la zona: se elige de la lista en lugar de escribir
const TIPOS_FORRAJE = [
    "Alfalfa",
    "Pasto de corte",
    "Kikuyo",
    "Raygrass",
    "Maíz forrajero",
    "Mezcla de forrajes",
    "Otro",
];

// Registro de movilización CAT → planta: cierra el eslabón de transporte
// donde el diagnóstico identificó pérdida total de trazabilidad.
export function FormMovilizacion({ lote, onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const hoy = new Date().toISOString().slice(0, 16);

    const [form, setForm] = useState<RegistrarMovilizacionRequest>({
        fechaDespacho: hoy,
        conductor: "",
        cantidadMovilizada: lote.cantidadAnimales,
        condicionesTransporte: "",
        tipoForraje: "",
        diasRetiroMedicamentos: undefined,
        responsableDespacho: auth.nombreCompleto ?? "",
        observaciones: "",
    });
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: () => recepcionApi.registrarMovilizacion(lote.codigoLote, form),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["movilizaciones"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo registrar la movilización.");
        },
    });

    return (
        <ModalShell
            onClose={onClose}
            title="Enviar lote a la planta"
            subtitle={`${lote.codigoLote} → Planta Sulupali Chico`}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-movilizacion"
                        disabled={mutation.isPending}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Registrando…" : "Registrar salida"}
                    </button>
                </div>
            }
        >
                <form
                    id="form-movilizacion"
                    onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                                Fecha de despacho
                            </label>
                            <input
                                type="datetime-local" required
                                value={form.fechaDespacho}
                                onChange={(e) => setForm({ ...form, fechaDespacho: e.target.value })}
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                                Cuyes que viajan
                            </label>
                            <input
                                type="number" min={1} max={lote.cantidadAnimales} required
                                value={form.cantidadMovilizada}
                                onChange={(e) => setForm({
                                    ...form, cantidadMovilizada: Number(e.target.value)
                                })}
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-0.5">
                                El lote tiene {lote.cantidadAnimales}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Conductor / transportista
                        </label>
                        <input
                            type="text" required
                            value={form.conductor}
                            onChange={(e) => setForm({ ...form, conductor: e.target.value })}
                            placeholder="Nombre de quien transporta"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Condiciones del transporte (opcional)
                        </label>
                        <input
                            type="text"
                            value={form.condicionesTransporte}
                            onChange={(e) => setForm({
                                ...form, condicionesTransporte: e.target.value
                            })}
                            placeholder="Por ejemplo: jaulas limpias, camioneta cubierta"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>

                    {/* Declaración de tratamientos (guía de movilización) */}
                    <div className="bg-bayo-50 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-bayo-700">
                            Declaración de tratamientos
                        </p>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                                Tipo de forraje
                            </label>
                            <select
                                value={form.tipoForraje}
                                onChange={(e) => setForm({ ...form, tipoForraje: e.target.value })}
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           bg-white text-sm focus:border-primary-500
                           focus:outline-none"
                            >
                                <option value="">Sin declaración</option>
                                {TIPOS_FORRAJE.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                                Días desde el último medicamento (si aplica)
                            </label>
                            <input
                                type="number" min={0}
                                value={form.diasRetiroMedicamentos ?? ""}
                                onChange={(e) => setForm({
                                    ...form,
                                    diasRetiroMedicamentos: e.target.value
                                        ? Number(e.target.value) : undefined
                                })}
                                placeholder="Dejar vacío si no recibieron"
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           bg-white text-sm focus:border-primary-500
                           focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Responsable del despacho
                        </label>
                        <input
                            type="text" required
                            value={form.responsableDespacho}
                            onChange={(e) => setForm({
                                ...form, responsableDespacho: e.target.value
                            })}
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
