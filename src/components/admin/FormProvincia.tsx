import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { geografiaApi } from "../../api/catalogos";
import { ModalShell } from "../ui/ModalShell";
import type { Provincia } from "../../types/admin";

interface Props {
    provincia: Provincia | null; // null = crear nueva
    onClose: () => void;
}

export function FormProvincia({ provincia, onClose }: Props) {
    const qc = useQueryClient();
    const editando = provincia !== null;

    const [nombre, setNombre] = useState(provincia?.nombre ?? "");
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async () => {
            if (editando) {
                await geografiaApi.actualizarProvincia(provincia.id, { nombre });
            } else {
                await geografiaApi.crearProvincia({ nombre });
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["provincias"] });
            // El nombre de la provincia viaja desnormalizado dentro de cada
            // Canton (`canton.provincia`) y, un nivel más abajo, dentro de
            // cada CentroAcopio (`centro.provincia`): renombrarla sin
            // invalidar estas dos cachés dejaría ambas tablas mostrando el
            // nombre viejo hasta que otra acción, sin relación, las
            // refrescara.
            qc.invalidateQueries({ queryKey: ["cantones"] });
            qc.invalidateQueries({ queryKey: ["centros-acopio"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo guardar la provincia.");
        },
    });

    return (
        <ModalShell
            onClose={onClose}
            title={editando ? "Editar provincia" : "Nueva provincia"}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-provincia"
                        disabled={mutation.isPending}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Guardar provincia"}
                    </button>
                </div>
            }
        >
            <form
                id="form-provincia"
                onSubmit={(e) => {
                    e.preventDefault();
                    setError(null);
                    mutation.mutate();
                }}
                className="space-y-4"
            >
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Nombre de la provincia
                    </label>
                    <input
                        type="text" required value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Por ejemplo: Azuay"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
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
