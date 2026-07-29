import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recepcionApi } from "../api/recepcion";
import { productorasApi } from "../api/productoras";
import { MainLayout } from "../components/layout/MainLayout";
import type { VinculacionPendiente } from "../types/recepcion";

function fecha(iso: string): string {
    return new Date(iso).toLocaleString("es-EC", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function Vinculaciones() {
    const qc = useQueryClient();
    // Productora elegida por cada entrega pendiente (id vinculación → id productora)
    const [seleccion, setSeleccion] = useState<Record<number, number>>({});

    const { data = [], isLoading, isError } = useQuery({
        queryKey: ["vinculaciones"],
        queryFn: () => recepcionApi.listarVinculaciones(),
    });

    // El catálogo completo (admin) para sugerir la productora correcta,
    // filtrado por el centro de cada entrega
    const { data: productoras = [] } = useQuery({
        queryKey: ["productoras", "todas"],
        queryFn: () => productorasApi.listar(),
    });

    const resolver = useMutation({
        mutationFn: ({ id, productoraId }: { id: number; productoraId: number }) =>
            recepcionApi.resolverVinculacion(id, productoraId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["vinculaciones"] });
            qc.invalidateQueries({ queryKey: ["lotes"] });
        },
    });

    const descartar = useMutation({
        mutationFn: (id: number) => recepcionApi.descartarVinculacion(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["vinculaciones"] }),
    });

    const productorasDeCentro = (v: VinculacionPendiente) =>
        productoras.filter((p) => p.catAsignado === v.centroAcopio && p.activa);

    const confirmarDescartar = (v: VinculacionPendiente) => {
        if (window.confirm(
            `¿Descartar la entrega de la cédula ${v.cedula}? Sus ${v.cantidadCuyes} ` +
            "cuyes no se registrarán. Esta acción no se puede deshacer.")) {
            descartar.mutate(v.id);
        }
    };

    return (
        <MainLayout>
            <header className="mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                    Bandeja de vinculación
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Entregas capturadas sin conexión cuya cédula es válida pero no
                    corresponde a ninguna productora del centro. Asígnalas a la
                    productora correcta para que sus cuyes entren a la jaula.
                </p>
            </header>

            {isLoading && (
                <p className="text-sm text-gray-400 py-10 text-center">
                    Cargando entregas pendientes…
                </p>
            )}

            {isError && (
                <div className="bg-teja-50 border border-teja-200 rounded-xl
                    px-4 py-3 text-sm text-teja-700">
                    No se pudieron cargar las entregas. Revisa tu conexión.
                </div>
            )}

            {!isLoading && !isError && data.length === 0 && (
                <p className="text-sm text-gray-400 py-10 text-center">
                    No hay entregas pendientes de vincular. 🎉
                </p>
            )}

            {data.length > 0 && (
                <div className="space-y-3">
                    {data.map((v) => {
                        const opciones = productorasDeCentro(v);
                        const elegida = seleccion[v.id] ?? 0;
                        return (
                            <div key={v.id}
                                className="bg-white rounded-2xl border border-gray-200 p-4">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            Cédula {v.cedula}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {v.centroAcopio} · {v.cantidadCuyes} cuyes ·{" "}
                                            {v.pesoTotalGramos.toLocaleString("es-EC")} g
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Capturada {fecha(v.fechaCaptura)} · recibió{" "}
                                            {v.responsableRecepcion}
                                        </p>
                                        {v.observaciones && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {v.observaciones}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select
                                        value={elegida}
                                        onChange={(e) => setSeleccion({
                                            ...seleccion,
                                            [v.id]: Number(e.target.value),
                                        })}
                                        className="flex-1 h-11 px-3 rounded-xl border-2
                                            border-gray-200 bg-white text-sm
                                            focus:border-primary-500 focus:outline-none"
                                    >
                                        <option value={0}>Elige la productora…</option>
                                        {opciones.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nombreCompleto} · {p.cedula} · {p.comunidad}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => resolver.mutate({
                                            id: v.id, productoraId: elegida,
                                        })}
                                        disabled={elegida === 0 || resolver.isPending}
                                        className="min-h-[44px] px-4 rounded-xl bg-primary-600
                                            hover:bg-primary-700 disabled:bg-primary-300
                                            text-white text-sm font-bold transition"
                                    >
                                        Vincular y registrar
                                    </button>
                                    <button
                                        onClick={() => confirmarDescartar(v)}
                                        disabled={descartar.isPending}
                                        className="min-h-[44px] px-4 rounded-xl text-sm font-bold
                                            text-teja-600 hover:bg-teja-50 transition"
                                    >
                                        Descartar
                                    </button>
                                </div>

                                {opciones.length === 0 && (
                                    <p className="text-xs text-bayo-700 mt-2">
                                        No hay productoras registradas en {v.centroAcopio}.
                                        Crea la productora en el módulo de Productoras y
                                        vuelve aquí.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </MainLayout>
    );
}
