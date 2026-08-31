import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recepcionApi } from "../../api/recepcion";
import { useAuth } from "../../context/useAuth";
import { useCentrosAcopio, useNombreCat, etiquetaCat } from "../../hooks/useCatalogos";
import { CAPACIDAD_JAULA } from "../../domain/reglasRecepcion";

interface Props {
    isOnline: boolean;
}

// Jaula en armado del CAT: muestra el progreso hacia el cupo de la jaula
// (CAPACIDAD_JAULA), las productoras que la integran y permite cerrarla
// manualmente.
// Un Operador de CAT queda fijado a su centro asignado.
export function JaulaEnArmado({ isOnline }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const catFijo = auth.rol === "OperadorCAT" ? auth.catAsignado : null;
    // Una sola consulta con inactivos incluidos (misma clave de caché que usa
    // useNombreCat más abajo, así que TanStack Query la deduplica en una sola
    // petición) y se filtra aquí a los activos: son los únicos que tiene
    // sentido ofrecer como elección nueva en el selector de abajo.
    const {
        data: centrosTodos = [], isLoading: cargandoCentros,
        isError: errorCentros, refetch: refetchCentros,
    } = useCentrosAcopio(true);
    const centros = useMemo(() => centrosTodos.filter((c) => c.activo), [centrosTodos]);
    const nombreCat = useNombreCat();
    // Sin centro fijo, arranca vacío y se queda así hasta que alguien elija
    // uno a mano: ya no hay preselección automática del primer centro del
    // catálogo (ver el selector más abajo).
    const [cat, setCat] = useState<string>(catFijo ?? "");
    const [aviso, setAviso] = useState<string | null>(null);

    const { data: jaula, isLoading } = useQuery({
        queryKey: ["lote_abierto", cat],
        queryFn: () => recepcionApi.obtenerLoteAbierto(cat),
        // Sin centro elegido todavía no hay nada que consultar: consultar
        // con "" traería el lote equivocado.
        enabled: isOnline && !!cat,
        refetchInterval: 30_000,
    });

    const cerrar = useMutation({
        mutationFn: (codigo: string) => recepcionApi.cerrarLote(codigo),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["lote_abierto"] });
            qc.invalidateQueries({ queryKey: ["lotes"] });
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setAviso(err.response?.data?.mensaje ?? "No se pudo cerrar la jaula.");
        },
    });

    const progreso = jaula ? (jaula.cantidadAnimales / CAPACIDAD_JAULA) * 100 : 0;

    return (
        <div className="bg-white rounded-2xl border-2 border-primary-100 p-5 mb-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-extrabold tracking-tight text-gray-900">
                        Jaula en armado
                    </h2>
                    {catFijo ? (
                        <span className="h-9 px-3 inline-flex items-center rounded-lg
                             bg-primary-50 text-primary-800 text-xs font-bold">
                            {nombreCat(catFijo)}
                        </span>
                    ) : (
                        <select
                            value={cat}
                            onChange={(e) => setCat(e.target.value)}
                            className="h-9 px-2 rounded-lg border-2 border-gray-200 text-xs
                         font-semibold focus:border-primary-500 focus:outline-none"
                        >
                            {/* Marcador de posición: sin él el select se ve como una
                                caja vacía en vez de pedir explícitamente una elección. */}
                            <option value="" disabled>
                                {cargandoCentros ? "Cargando…" : "Seleccionar centro…"}
                            </option>
                            {centros.map((c) => (
                                <option key={c.codigo} value={c.codigo}>{etiquetaCat(c)}</option>
                            ))}
                        </select>
                    )}
                </div>

                {jaula && (
                    <button
                        onClick={() => cerrar.mutate(jaula.codigoLote)}
                        disabled={cerrar.isPending}
                        className="h-10 px-4 rounded-xl border-2 border-primary-600
                       text-primary-700 text-xs font-bold hover:bg-primary-50
                       disabled:opacity-50 transition"
                        title={`Cierra la jaula aunque no llegue a ${CAPACIDAD_JAULA}, dejándola lista para enviar a la planta`}
                    >
                        {cerrar.isPending ? "Cerrando…" : "Cerrar jaula"}
                    </button>
                )}
            </div>

            {!isOnline ? (
                <p className="text-sm text-gray-400">
                    Sin conexión: las entregas se guardan en la tablet y se
                    sumarán a la jaula al sincronizar.
                </p>
            ) : !cat ? (
                // Ya no hay preselección automática: sin CAT fijo, esto se ve
                // hasta que alguien elija un centro en el select de arriba,
                // no solo "un instante". Por eso el mensaje no puede seguir
                // diciendo "cargando" — mentiría en cuanto el catálogo llegue
                // y nadie haya elegido nada todavía.
                centros.length === 0 && !cargandoCentros ? (
                    <p className="text-sm text-teja-600">
                        {errorCentros
                            ? "No se pudo cargar el catálogo de centros de acopio. "
                            : "Todavía no hay centros de acopio creados. "}
                        {errorCentros && (
                            <button
                                type="button"
                                onClick={() => refetchCentros()}
                                className="font-bold underline underline-offset-2"
                            >
                                Reintentar
                            </button>
                        )}
                    </p>
                ) : (
                    <p className="text-sm text-gray-400">
                        {cargandoCentros
                            ? "Cargando centros de acopio…"
                            : "Elige un centro de acopio para ver su jaula."}
                    </p>
                )
            ) : isLoading ? (
                <p className="text-sm text-gray-400">Consultando jaula…</p>
            ) : !jaula ? (
                <p className="text-sm text-gray-400">
                    No hay jaula abierta en este centro. Se creará sola con la
                    primera entrega.
                </p>
            ) : (
                <>
                    <div className="flex items-baseline justify-between mb-1">
                        <span className="font-mono text-sm font-bold text-gray-800">
                            {jaula.codigoLote}
                        </span>
                        <span className="text-sm font-extrabold text-gray-900">
                            {jaula.cantidadAnimales}
                            <span className="text-gray-400 font-medium"> / {CAPACIDAD_JAULA} cuyes</span>
                        </span>
                    </div>

                    {/* Barra de progreso de la jaula */}
                    <div className="h-4 rounded-full bg-gray-100 overflow-hidden mb-3">
                        <div
                            className={`h-full rounded-full transition-[width] duration-700 ease-salida
                          ${jaula.cantidadAnimales >= CAPACIDAD_JAULA
                                    ? "bg-primary-600" : "bg-bayo-500"}`}
                            style={{ width: `${progreso}%` }}
                        />
                    </div>

                    {/* Productoras que integran la jaula */}
                    {jaula.productoras.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {jaula.productoras.map((p) => (
                                <span key={p.productoraId}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1
                             rounded-full bg-primary-50 text-primary-800
                             text-xs font-semibold">
                                    {p.nombre}
                                    <span className="bg-primary-600 text-white rounded-full
                                   px-1.5 text-[10px] font-bold">
                                        {p.cantidad}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </>
            )}

            {aviso && (
                <p className="mt-3 text-sm text-teja-600 bg-teja-50 rounded-xl
                      px-3 py-2 flex items-center justify-between">
                    {aviso}
                    <button onClick={() => setAviso(null)}
                        className="font-bold ml-3">✕</button>
                </p>
            )}
        </div>
    );
}
