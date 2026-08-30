import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogosApi } from "../../api/admin";
import { Badge } from "../ui/Badge";
import { FormComunidad } from "./FormComunidad";
import type { Comunidad } from "../../types/admin";
import { useNombreCat } from "../../hooks/useCatalogos";

export function TablaComunidades() {
    const qc = useQueryClient();
    const [comunidadEditar, setComunidadEditar] = useState<Comunidad | null>(null);
    const [showForm, setShowForm] = useState(false);

    const { data: comunidades = [], isLoading } = useQuery({
        queryKey: ["comunidades", "admin"],
        queryFn: () => catalogosApi.listarComunidades(true),
    });

    const toggle = useMutation({
        mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
            catalogosApi.cambiarEstadoComunidad(id, activa),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["comunidades"] });
            // Mismo motivo que en FormComunidad: activar/desactivar una
            // comunidad cambia `totalComunidades` en TablaCantones.
            qc.invalidateQueries({ queryKey: ["cantones"] });
        },
    });

    const nombreCat = useNombreCat();

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => { setComunidadEditar(null); setShowForm(true); }}
                    className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-semibold rounded-xl transition
                     active:scale-[0.98]"
                >
                    + Nueva comunidad
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto
                      animate-fade-in-up">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                        Cargando comunidades…
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Comunidad", "Cantón", "CAT de referencia", "Estado", ""]
                                    .map((h) => (
                                        <th key={h}
                                            className="px-4 py-3 text-left text-xs font-bold
                                     text-gray-500 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {comunidades.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {c.nombre}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{c.canton}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {nombreCat(c.catReferencia)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            label={c.activa ? "Activa" : "Inactiva"}
                                            variant={c.activa ? "success" : "danger"}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                setComunidadEditar(c);
                                                setShowForm(true);
                                            }}
                                            className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggle.mutate({
                                                id: c.id, activa: !c.activa
                                            })}
                                            className={`text-xs font-semibold
                                    ${c.activa
                                                    ? "text-teja-500 hover:text-teja-700"
                                                    : "text-primary-600 hover:text-primary-800"}`}
                                        >
                                            {c.activa ? "Desactivar" : "Activar"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && (
                <FormComunidad
                    comunidad={comunidadEditar}
                    onClose={() => setShowForm(false)}
                />
            )}
        </>
    );
}
