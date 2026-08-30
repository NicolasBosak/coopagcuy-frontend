import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import type { Comunidad } from "../../types/admin";
import { useCantones, useCentrosAcopio, etiquetaCat } from "../../hooks/useCatalogos";

interface Props {
    comunidad: Comunidad | null; // null = crear nueva
    onClose: () => void;
}

export function FormComunidad({ comunidad, onClose }: Props) {
    const qc = useQueryClient();
    const editando = comunidad !== null;

    const [nombre, setNombre] = useState(comunidad?.nombre ?? "");
    // 0 = nada elegido todavía: no hay un cantón "por defecto" razonable
    // ahora que el catálogo llega del servidor.
    const [cantonId, setCantonId] = useState(comunidad?.cantonId ?? 0);
    const [cat, setCat] = useState(comunidad?.catReferencia ?? "");
    const [error, setError] = useState<string | null>(null);

    // La gestión de provincias y cantones (alta, edición) es de la Task 8;
    // aquí solo se listan para poblar el selector de esta comunidad.
    const { data: cantones = [], isLoading: cargandoCantones } = useCantones();
    const { data: centros = [], isLoading: cargandoCentros } = useCentrosAcopio();

    const mutation = useMutation({
        mutationFn: async () => {
            const body = { nombre, cantonId, catReferencia: cat };
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
                    <select
                        required
                        value={cantonId || ""}
                        onChange={(e) => setCantonId(Number(e.target.value))}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    >
                        <option value="" disabled>
                            {cargandoCantones ? "Cargando cantones…" : "Seleccionar cantón…"}
                        </option>
                        {cantones.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.nombre} ({c.provincia})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Centro de acopio de referencia
                    </label>
                    <select
                        required
                        value={cat}
                        onChange={(e) => setCat(e.target.value)}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    >
                        <option value="" disabled>
                            {cargandoCentros ? "Cargando centros…" : "Seleccionar centro…"}
                        </option>
                        {centros.map((c) => (
                            <option key={c.codigo} value={c.codigo}>{etiquetaCat(c)}</option>
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
