import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { centrosAcopioApi } from "../../api/catalogos";
import { ModalShell } from "../ui/ModalShell";
import { SelectorCanton } from "./SelectorCanton";
import type { CentroAcopio } from "../../types/admin";

interface Props {
    centro: CentroAcopio | null; // null = crear nuevo
    onClose: () => void;
}

export function FormCentroAcopio({ centro, onClose }: Props) {
    const qc = useQueryClient();
    const editando = centro !== null;

    const [codigo, setCodigo] = useState(centro?.codigo ?? "");
    const [nombre, setNombre] = useState(centro?.nombre ?? "");
    const [cantonId, setCantonId] = useState<number | undefined>(centro?.cantonId);
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async () => {
            if (editando) {
                await centrosAcopioApi.actualizar(centro.codigo,
                    { nombre, cantonId: cantonId! });
            } else {
                await centrosAcopioApi.crear(
                    { codigo, nombre, cantonId: cantonId! });
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["centros-acopio"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo guardar el centro de acopio.");
        },
    });

    return (
        <ModalShell
            onClose={onClose}
            title={editando ? "Editar centro de acopio" : "Nuevo centro de acopio"}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-centro-acopio"
                        disabled={mutation.isPending || !cantonId}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Guardar centro"}
                    </button>
                </div>
            }
        >
            <form
                id="form-centro-acopio"
                onSubmit={(e) => {
                    e.preventDefault();
                    setError(null);
                    // Repite la condición del botón por si se llega aquí sin
                    // pasar por él (por ejemplo, Enter dentro de un campo).
                    if (!cantonId) {
                        setError("Elige un cantón antes de guardar.");
                        return;
                    }
                    mutation.mutate();
                }}
                className="space-y-4"
            >
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Código
                    </label>
                    <input
                        type="text" required maxLength={3}
                        pattern="[A-Za-z]{3}"
                        value={codigo}
                        disabled={editando}
                        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                        placeholder="PAT"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                            text-base font-mono uppercase tracking-widest
                            disabled:bg-gray-100 disabled:text-gray-500
                            focus:border-primary-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {editando
                            ? "El código no se puede cambiar: encabeza el identificador de cada jaula ya registrada."
                            : "Tres letras. Encabeza el identificador de cada jaula del centro (por ejemplo, PAT-20260615-001)."}
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Nombre del centro de acopio
                    </label>
                    <input
                        type="text" required value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Por ejemplo: Patococha"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <SelectorCanton cantonId={cantonId} onCambio={setCantonId} />

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
