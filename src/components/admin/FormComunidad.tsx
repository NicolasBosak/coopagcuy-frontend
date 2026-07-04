import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import type { Comunidad } from "../../types/admin";
import { CENTROS_ACOPIO } from "../../types/productora";

interface Props {
    comunidad: Comunidad | null; // null = crear nueva
    onClose: () => void;
}

export function FormComunidad({ comunidad, onClose }: Props) {
    const qc = useQueryClient();
    const editando = comunidad !== null;

    const [nombre, setNombre] = useState(comunidad?.nombre ?? "");
    const [canton, setCanton] = useState(comunidad?.canton ?? "");
    const [cat, setCat] = useState(comunidad?.catReferencia ?? "PAT");
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async () => {
            const body = { nombre, canton, catReferencia: cat };
            if (editando) {
                await catalogosApi.actualizarComunidad(comunidad.id, body);
            } else {
                await catalogosApi.crearComunidad(body);
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["comunidades"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo guardar la comunidad.");
        },
    });

    return (
        <ModalShell
            onClose={onClose}
            title={editando ? "Editar comunidad" : "Nueva comunidad"}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-comunidad"
                        disabled={mutation.isPending}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Guardar comunidad"}
                    </button>
                </div>
            }
        >
            <form
                id="form-comunidad"
                onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}
                className="space-y-4"
            >
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Nombre de la comunidad
                    </label>
                    <input
                        type="text" required value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Por ejemplo: Patococha"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Cantón
                    </label>
                    <input
                        type="text" required value={canton}
                        onChange={(e) => setCanton(e.target.value)}
                        placeholder="Por ejemplo: Pucará"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Centro de acopio de referencia
                    </label>
                    <select
                        value={cat}
                        onChange={(e) => setCat(e.target.value)}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    >
                        {CENTROS_ACOPIO.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
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
