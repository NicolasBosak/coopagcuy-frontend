import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { centrosAcopioApi } from "../../api/catalogos";
import { Badge } from "../ui/Badge";
import { FormCentroAcopio } from "./FormCentroAcopio";
import type { CentroAcopio } from "../../types/admin";
import { useCentrosAcopio } from "../../hooks/useCatalogos";
import { useIsOnline } from "../../context/useIsOnline";

export function TablaCentrosAcopio() {
    const qc = useQueryClient();
    const isOnline = useIsOnline();
    const [centroEditar, setCentroEditar] = useState<CentroAcopio | null>(null);
    const [showForm, setShowForm] = useState(false);
    // El mensaje del 409 al desactivar (ver `toggle` abajo) se limpia al
    // abrir "Nuevo centro" o "Editar": sin esto sobrevive a abrir un
    // formulario que no tiene nada que ver con el aviso.
    const [error, setError] = useState<string | null>(null);

    // Con inactivos incluidos: el administrador tiene que poder reactivar un
    // centro dado de baja por error.
    const {
        data: centros = [], isLoading, isError, refetch,
    } = useCentrosAcopio(true);

    const toggle = useMutation({
        mutationFn: ({ codigo, activo }: { codigo: string; activo: boolean }) =>
            centrosAcopioApi.cambiarEstado(codigo, activo),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["centros-acopio"] });
            setError(null);
        },
        // El API rechaza desactivar un centro con jaulas o lotes en curso. El
        // mensaje que manda ya explica la causa con números: mostrarlo tal
        // cual es más útil que un "no se pudo" genérico.
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo cambiar el estado del centro de acopio.");
        },
    });

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => {
                        setError(null);
                        setCentroEditar(null);
                        setShowForm(true);
                    }}
                    className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-semibold rounded-xl transition
                     active:scale-[0.98]"
                >
                    + Nuevo centro de acopio
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
                        Cargando centros de acopio…
                    </div>
                ) : centros.length === 0 ? (
                    // isLoading es false tanto si la consulta terminó vacía como si
                    // falló o quedó pausada sin red: sin distinguir los tres casos,
                    // un fallo de red se vería igual que un catálogo genuinamente
                    // vacío.
                    <div className="p-8 text-center text-sm">
                        {!isOnline ? (
                            <p className="text-teja-600">
                                Sin conexión: no se pudo cargar el catálogo de centros de acopio.
                            </p>
                        ) : isError ? (
                            <>
                                <p className="text-teja-600 font-semibold">
                                    No se pudo cargar el catálogo de centros de acopio.
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
                                Todavía no hay centros de acopio creados.
                            </p>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Código", "Nombre", "Cantón", "Provincia", "Estado", ""]
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
                            {centros.map((c) => (
                                <tr key={c.codigo} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-mono font-bold text-gray-800">
                                        {c.codigo}
                                    </td>
                                    <td className="px-4 py-3 text-gray-800">{c.nombre}</td>
                                    <td className="px-4 py-3 text-gray-600">{c.canton}</td>
                                    <td className="px-4 py-3 text-gray-600">{c.provincia}</td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            label={c.activo ? "Activo" : "Inactivo"}
                                            variant={c.activo ? "success" : "danger"}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                setCentroEditar(c);
                                                setShowForm(true);
                                            }}
                                            className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggle.mutate({
                                                codigo: c.codigo, activo: !c.activo
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
                <FormCentroAcopio
                    centro={centroEditar}
                    onClose={() => setShowForm(false)}
                />
            )}
        </>
    );
}
