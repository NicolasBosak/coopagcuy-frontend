import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recepcionApi } from "../../api/recepcion";
import { catalogosApi } from "../../api/admin";
import { useAuth } from "../../context/AuthContext";
import { ModalShell } from "../ui/ModalShell";
import { SelloDeTiempo } from "../ui/SelloDeTiempo";
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

    const [form, setForm] = useState<RegistrarMovilizacionRequest>({
        conductor: "",
        cantidadMovilizada: lote.cantidadAnimales,
        condicionesTransporte: [],
        tipoForraje: "",
        diasRetiroMedicamentos: undefined,
        responsableDespacho: auth.nombreCompleto ?? "",
        observaciones: "",
    });
    const [error, setError] = useState<string | null>(null);

    // Las etiquetas vienen del API: son el mismo catálogo que valida el
    // servidor, así no pueden decir una cosa aquí y otra allá
    const { data: condiciones = [] } = useQuery({
        queryKey: ["condiciones_transporte"],
        queryFn: () => catalogosApi.listarCondicionesTransporte(),
        staleTime: Infinity, // catálogo fijo: no hace falta revalidar
    });

    const alternarCondicion = (clave: string) =>
        setForm((f) => ({
            ...f,
            condicionesTransporte: f.condicionesTransporte.includes(clave)
                ? f.condicionesTransporte.filter((c) => c !== clave)
                : [...f.condicionesTransporte, clave],
        }));

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
                        <SelloDeTiempo etiqueta="Fecha de despacho" />
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
                            Condiciones del transporte
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Marca lo que verificaste antes de salir. Lo que quede
                            sin marcar se registra como no verificado.
                        </p>
                        {/* Checklist en vez de texto libre: cada CAT escribía lo
                            suyo y las guías no eran comparables entre sí */}
                        <div className="space-y-1">
                            {condiciones.map((c) => {
                                const marcada = form.condicionesTransporte.includes(c.clave);
                                return (
                                    <label
                                        key={c.clave}
                                        className={`flex items-center gap-3 min-h-[44px] px-3
                                       rounded-xl border-2 cursor-pointer transition
                                       ${marcada
                                                ? "border-primary-500 bg-primary-50"
                                                : "border-gray-200 bg-white hover:bg-gray-50"}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={marcada}
                                            onChange={() => alternarCondicion(c.clave)}
                                            className="w-5 h-5 accent-primary-600 shrink-0"
                                        />
                                        <span className={`text-sm ${marcada
                                            ? "font-semibold text-primary-800"
                                            : "text-gray-700"}`}>
                                            {c.etiqueta}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {condiciones.length > 0 && (
                            <p className="mt-1.5 text-xs text-gray-400">
                                {form.condicionesTransporte.length} de {condiciones.length} verificadas
                            </p>
                        )}
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
