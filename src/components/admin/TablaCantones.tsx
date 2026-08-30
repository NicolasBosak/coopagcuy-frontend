import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { geografiaApi } from "../../api/catalogos";
import { Badge } from "../ui/Badge";
import { FormCanton } from "./FormCanton";
import type { Canton } from "../../types/admin";
import { useProvincias, useCantones } from "../../hooks/useCatalogos";

export function TablaCantones() {
    const qc = useQueryClient();
    const [cantonEditar, setCantonEditar] = useState<Canton | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filtroProvincia, setFiltroProvincia] = useState<number | undefined>();

    const { data: provincias = [] } = useProvincias(true);
    // Con inactivos incluidos: el administrador tiene que poder reactivar un
    // cantón dado de baja por error, y el filtro de arriba ya acota la vista
    // a algo manejable (son 221 en total).
    const {
        data: cantones = [], isLoading, isError, refetch,
    } = useCantones(filtroProvincia, true);

    const toggle = useMutation({
        mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
            geografiaApi.cambiarEstadoCanton(id, activo),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["cantones"] });
            // El cambio de estado mueve el conteo de cantones activos de su
            // provincia: sin esto, TablaProvincias se quedaría con el
            // número viejo hasta otra invalidación ajena.
            qc.invalidateQueries({ queryKey: ["provincias"] });
            setError(null);
        },
        // El API rechaza desactivar un cantón con comunidades vivas. El
        // mensaje que manda ya explica cuántas son: mostrarlo tal cual es
        // más útil que un "no se pudo" genérico.
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo cambiar el estado del cantón.");
        },
    });

    return (
        <>
            <div className="flex flex-wrap gap-3 items-end justify-between mb-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Provincia
                    </label>
                    <select
                        value={filtroProvincia ?? ""}
                        onChange={(e) => setFiltroProvincia(
                            e.target.value ? Number(e.target.value) : undefined)}
                        className="h-11 px-3 rounded-xl border-2 border-gray-200
                            text-base focus:border-primary-500 focus:outline-none"
                    >
                        <option value="">Todas</option>
                        {provincias.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => { setCantonEditar(null); setShowForm(true); }}
                    className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                        text-white text-sm font-semibold rounded-xl transition
                        active:scale-[0.98]"
                >
                    + Nuevo cantón
                </button>
            </div>

            {error && (
                <div className="mb-4 bg-teja-50 border border-teja-100 rounded-xl
                    px-3 py-2 text-sm text-teja-700">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto
                      animate-fade-in-up">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                        Cargando cantones…
                    </div>
                ) : cantones.length === 0 ? (
                    // isLoading es false tanto si la consulta terminó vacía como si
                    // falló o quedó pausada sin red: sin distinguir los tres casos,
                    // un fallo de red se vería igual que un catálogo genuinamente
                    // vacío (o que un filtro sin resultados).
                    <div className="p-8 text-center text-sm">
                        {!navigator.onLine ? (
                            <p className="text-teja-600">
                                Sin conexión: no se pudo cargar el catálogo de cantones.
                            </p>
                        ) : isError ? (
                            <>
                                <p className="text-teja-600 font-semibold">
                                    No se pudo cargar el catálogo de cantones.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => refetch()}
                                    className="mt-1.5 text-xs font-bold text-teja-700
                                       underline underline-offset-2"
                                >
                                    Reintentar
                                </button>
                            </>
                        ) : (
                            <p className="text-gray-400">
                                {filtroProvincia
                                    ? "Esta provincia todavía no tiene cantones creados."
                                    : "Todavía no hay cantones creados."}
                            </p>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Cantón", "Provincia", "Comunidades activas", "Estado", ""]
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
                            {cantones.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {c.nombre}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{c.provincia}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {c.totalComunidades}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            label={c.activo ? "Activo" : "Inactivo"}
                                            variant={c.activo ? "success" : "danger"}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                setCantonEditar(c);
                                                setShowForm(true);
                                            }}
                                            className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggle.mutate({
                                                id: c.id, activo: !c.activo
                                            })}
                                            className={`text-xs font-semibold
                                    ${c.activo
                                                    ? "text-teja-500 hover:text-teja-700"
                                                    : "text-primary-600 hover:text-primary-800"}`}
                                        >
                                            {c.activo ? "Desactivar" : "Activar"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && (
                <FormCanton
                    canton={cantonEditar}
                    onClose={() => setShowForm(false)}
                />
            )}
        </>
    );
}
