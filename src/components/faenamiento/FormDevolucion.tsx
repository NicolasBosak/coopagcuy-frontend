import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faenamientoApi } from "../../api/faenamiento";
import { useAuth } from "../../context/AuthContext";
import { ModalShell } from "../ui/ModalShell";
import type { RegistrarDevolucionRequest } from "../../types/admin";

interface Props {
    onClose: () => void;
}

// Registro de devolución de cliente — RF-307.
// La devolución se vincula a la sesión de faenamiento específica (F1, F2…)
// para poder rastrear de qué tanda faenada proviene el producto devuelto.
export function FormDevolucion({ onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const hoy = new Date().toISOString().slice(0, 16);

    const [sesionId, setSesionId] = useState(0);
    const [form, setForm] = useState<Omit<RegistrarDevolucionRequest,
        "loteId" | "registroFaenamientoId">>({
            clienteDevuelve: "",
            fechaDevolucion: hoy,
            cantidadUnidades: 1,
            motivo: "",
            responsable: auth.nombreCompleto ?? "",
            observaciones: "",
        });
    const [error, setError] = useState<string | null>(null);

    // Cada registro de faenamiento ES una sesión (un lote puede tener varias)
    const { data: sesiones = [] } = useQuery({
        queryKey: ["faenamientos"],
        queryFn: () => faenamientoApi.listar(),
    });

    const sesionElegida = sesiones.find((s) => s.id === sesionId);
    const cuyesConNovedad = sesionElegida?.cuyes.filter(
        (c) => c.estado !== "Apto") ?? [];

    const mutation = useMutation({
        mutationFn: () => faenamientoApi.registrarDevolucion({
            ...form,
            loteId: sesionElegida!.loteId,
            registroFaenamientoId: sesionElegida!.id,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["devoluciones"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo registrar la devolución.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!sesionElegida) {
            setError("Selecciona la sesión de faenamiento devuelta.");
            return;
        }
        mutation.mutate();
    };

    const etiquetaSesion = (s: (typeof sesiones)[number]) => {
        const novedades = s.cuyes.filter((c) => c.estado !== "Apto").length;
        return `${s.codigoLote} · Sesión F${s.numeroSesion} · `
            + `${new Date(s.fechaFaenamiento).toLocaleDateString("es-EC")} · `
            + `${s.unidadesFaenadas} faenados`
            + (novedades > 0 ? ` · ⚠ ${novedades} con novedad` : "");
    };

    return (
        <ModalShell
            onClose={onClose}
            title="Registrar devolución"
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-devolucion"
                        disabled={mutation.isPending}
                        className="flex-1 h-12 bg-teja-500 hover:bg-teja-600
                       disabled:bg-teja-100 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Registrar devolución"}
                    </button>
                </div>
            }
        >
            <form id="form-devolucion" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Sesión de faenamiento devuelta
                        </label>
                        <select
                            required
                            value={sesionId}
                            onChange={(e) => setSesionId(Number(e.target.value))}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                        >
                            <option value={0}>Seleccionar sesión faenada…</option>
                            {sesiones.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {etiquetaSesion(s)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Cuyes con novedad de la sesión elegida: ayuda a
                        identificar de dónde proviene la devolución */}
                    {sesionElegida && cuyesConNovedad.length > 0 && (
                        <div className="bg-bayo-50 border border-bayo-100 rounded-xl
                            px-3 py-2.5 animate-fade-in">
                            <p className="text-xs font-bold text-bayo-700 mb-1">
                                ⚠ Esta sesión incluyó {cuyesConNovedad.length}
                                {cuyesConNovedad.length === 1
                                    ? " cuy con novedad:" : " cuyes con novedad:"}
                            </p>
                            {cuyesConNovedad.map((c) => (
                                <p key={c.numeroEnLote} className="text-xs text-gray-600">
                                    Cuy #{c.numeroEnLote}
                                    {c.motivo && ` — ${c.motivo}`}
                                    {c.pesoCanalGramos && ` (${c.pesoCanalGramos}g)`}
                                </p>
                            ))}
                        </div>
                    )}
                    {sesionElegida && cuyesConNovedad.length === 0 && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl
                          px-3 py-2 animate-fade-in">
                            Esta sesión no registró novedades en planta.
                        </p>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Cliente que devuelve
                        </label>
                        <input
                            type="text" required
                            value={form.clienteDevuelve}
                            onChange={(e) => setForm({ ...form, clienteDevuelve: e.target.value })}
                            placeholder="Nombre del restaurante o cliente"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                                Fecha
                            </label>
                            <input
                                type="datetime-local" required
                                value={form.fechaDevolucion}
                                onChange={(e) => setForm({ ...form, fechaDevolucion: e.target.value })}
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                                Unidades
                            </label>
                            <input
                                type="number" min={1} required
                                max={sesionElegida?.unidadesFaenadas}
                                value={form.cantidadUnidades}
                                onChange={(e) => setForm({
                                    ...form, cantidadUnidades: Number(e.target.value)
                                })}
                                className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                            />
                            {sesionElegida && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    La sesión faenó {sesionElegida.unidadesFaenadas}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Motivo de la devolución
                        </label>
                        <input
                            type="text" required
                            value={form.motivo}
                            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                            placeholder="Por ejemplo: carne dura, animal viejo"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            Responsable del registro
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
