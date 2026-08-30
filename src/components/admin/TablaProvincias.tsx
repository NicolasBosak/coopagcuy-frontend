import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { geografiaApi } from "../../api/catalogos";
import { Badge } from "../ui/Badge";
import { FormProvincia } from "./FormProvincia";
import type { Provincia } from "../../types/admin";
import { useProvincias } from "../../hooks/useCatalogos";
import { useIsOnline } from "../../context/useIsOnline";

export function TablaProvincias() {
    const qc = useQueryClient();
    const isOnline = useIsOnline();
    const [provinciaEditar, setProvinciaEditar] = useState<Provincia | null>(null);
    const [showForm, setShowForm] = useState(false);
    // El mensaje del 409 al desactivar (ver `toggle` abajo) se limpia al
    // abrir "Nueva provincia" o "Editar": sin esto sobrevive a abrir un
    // formulario que no tiene nada que ver con el aviso.
    const [error, setError] = useState<string | null>(null);

    // Con inactivas incluidas: el administrador tiene que poder reactivar
    // una provincia que se dio de baja por error.
    const {
        data: provincias = [], isLoading, isError, refetch,
    } = useProvincias(true);

    const toggle = useMutation({
        mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
            geografiaApi.cambiarEstadoProvincia(id, activa),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["provincias"] });
            setError(null);
        },
        // El API rechaza desactivar una provincia con cantones vivos. El
        // mensaje que manda ya explica cuántos son: mostrarlo tal cual es
        // más útil que un "no se pudo" genérico.
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo cambiar el estado de la provincia.");
        },
    });

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => {
                        setError(null);
                        setProvinciaEditar(null);
                        setShowForm(true);
                    }}
                    className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-semibold rounded-xl transition
                     active:scale-[0.98]"
                >
                    + Nueva provincia
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
                        Cargando provincias…
                    </div>
                ) : provincias.length === 0 ? (
                    // isLoading es false tanto si la consulta terminó vacía como si
                    // falló o quedó pausada sin red: sin distinguir los tres casos,
                    // un fallo de red se vería igual que un catálogo genuinamente
                    // vacío.
                    <div className="p-8 text-center text-sm">
                        {!isOnline ? (
                            <p className="text-teja-600">
                                Sin conexión: no se pudo cargar el catálogo de provincias.
                            </p>
                        ) : isError ? (
                            <>
                                <p className="text-teja-600 font-semibold">
                                    No se pudo cargar el catálogo de provincias.
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
                                Todavía no hay provincias creadas.
                            </p>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Provincia", "Cantones activos", "Estado", ""]
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
                            {provincias.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {p.nombre}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {p.totalCantones}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            label={p.activa ? "Activa" : "Inactiva"}
                                            variant={p.activa ? "success" : "danger"}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                setProvinciaEditar(p);
                                                setShowForm(true);
                                            }}
                                            className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggle.mutate({
                                                id: p.id, activa: !p.activa
                                            })}
                                            className={`text-xs font-semibold
                                    ${p.activa
                                                    ? "text-teja-500 hover:text-teja-700"
                                                    : "text-primary-600 hover:text-primary-800"}`}
                                        >
                                            {p.activa ? "Desactivar" : "Activar"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && (
                <FormProvincia
                    provincia={provinciaEditar}
                    onClose={() => setShowForm(false)}
                />
            )}
        </>
    );
}
