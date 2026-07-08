import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { faenamientoApi } from "../api/faenamiento";

export default function QRPublico() {
    const { codigoLote } = useParams<{ codigoLote: string }>();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["qr_publico", codigoLote],
        queryFn: () => faenamientoApi.paginaPublica(codigoLote!),
        enabled: !!codigoLote,
        retry: false,
    });

    if (isLoading) return (
        <div className="min-h-screen bg-primary-50 flex items-center
                    justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-600
                        border-t-transparent rounded-full animate-spin
                        mx-auto mb-4"/>
                <p className="text-sm text-primary-700">Cargando información del producto...</p>
            </div>
        </div>
    );

    if (isError || !data) return (
        <div className="min-h-screen bg-gray-50 flex items-center
                    justify-center p-4">
            <div className="text-center max-w-sm">
                <div className="text-4xl mb-4">🔍</div>
                <h1 className="text-lg font-semibold text-gray-800 mb-2">
                    Producto no encontrado
                </h1>
                <p className="text-sm text-gray-500">
                    El código QR escaneado no corresponde a ningún producto
                    registrado en el sistema.
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-primary-50">

            {/* Header marca */}
            <div className="bg-primary-700 text-white px-4 py-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12
                        bg-white/20 rounded-xl mb-3">
                    <span className="text-2xl font-bold">C</span>
                </div>
                <h1 className="text-xl font-semibold">{data.marca}</h1>
                <p className="text-primary-200 text-sm mt-1">
                    Trazabilidad desde el origen
                </p>
            </div>

            <div className="max-w-sm mx-auto px-4 py-6 space-y-4">

                {/* Código de lote */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-400 mb-1">Código de lote</p>
                    <p className="font-mono text-sm font-semibold text-gray-800">
                        {data.codigoLote}
                    </p>
                </div>

                {/* Origen */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-primary-700 uppercase
                        tracking-wide mb-3">
                        Origen del producto
                    </p>
                    <div className="space-y-2 text-sm">
                        {[
                            ["Comunidad", data.comunidadOrigen],
                            ["Cantón", data.canton],
                            ["Centro acopio", data.centroAcopio],
                            ["Productora", data.nombreProductora],
                            ["Fecha recepción", new Date(data.fechaRecepcion)
                                .toLocaleDateString("es-EC", {
                                    day: "2-digit", month: "long", year: "numeric"
                                })],
                            ["Animales", `${data.cantidadAnimales} cuyes`],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                                <span className="text-gray-500">{k}</span>
                                <span className="text-gray-800 font-medium text-right
                                 max-w-[60%]">
                                    {v}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comunidades que aportaron al lote */}
                {data.comunidadesAporte.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-primary-700 uppercase
                          tracking-wide mb-3">
                            Comunidades que aportaron
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {data.comunidadesAporte.map((c) => (
                                <span key={c.comunidad}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5
                             rounded-full bg-primary-50 text-primary-800
                             text-sm font-semibold">
                                    {c.comunidad}
                                    <span className="bg-primary-600 text-white rounded-full
                                   px-1.5 text-xs font-bold">
                                        {c.cantidad}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Parámetros de calidad */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-primary-700 uppercase
                        tracking-wide mb-3">
                        Controles de calidad aprobados
                    </p>
                    <div className="space-y-1.5">
                        {data.parametrosAprobados.map((p, i) => (
                            <p key={i} className="text-sm text-gray-700">{p}</p>
                        ))}
                    </div>
                </div>

                {/* Faenamiento */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-primary-700 uppercase
                        tracking-wide mb-3">
                        Procesamiento
                    </p>
                    <div className="space-y-2 text-sm">
                        {[
                            ["Fecha faenamiento", new Date(data.fechaFaenamiento)
                                .toLocaleDateString("es-EC", {
                                    day: "2-digit", month: "long", year: "numeric"
                                })],
                            ["Peso promedio canal", `${data.pesoPromedioCanalGramos}g`],
                            ["Estado canal", data.estadoCanal],
                            ["Planta", "Sulupali Chico, Santa Isabel"],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                                <span className="text-gray-500">{k}</span>
                                <span className="text-gray-800 font-medium text-right">
                                    {v}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detalle individual de los animales faenados */}
                {data.detalleCuyes.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-primary-700 uppercase
                          tracking-wide mb-3">
                            Detalle de los animales
                        </p>
                        <div className="space-y-1.5">
                            {data.detalleCuyes.map((c, i) => (
                                <div key={i}
                                    className="flex items-center justify-between gap-2
                               text-sm border-b border-gray-50 pb-1.5
                               last:border-0 last:pb-0">
                                    <span className="text-gray-600 min-w-0 truncate">
                                        #{c.numeroEnLote} · {c.comunidad}
                                        {c.pesoCanalGramos != null &&
                                            ` · ${Math.round(c.pesoCanalGramos)}g`}
                                    </span>
                                    <span className={`text-xs font-bold shrink-0
                                      ${c.estado === "Apto"
                                            ? "text-green-700"
                                            : "text-amber-600"}`}>
                                        {c.estado}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Observaciones del proceso en planta */}
                {data.observacionesProceso.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-primary-700 uppercase
                          tracking-wide mb-3">
                            Observaciones del proceso
                        </p>
                        <div className="space-y-1.5">
                            {data.observacionesProceso.map((o, i) => (
                                <p key={i} className="text-sm text-gray-700">• {o}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Transporte CAT → Centro de Faenamiento */}
                {(data.fechaSalidaCat || data.fechaLlegadaPlanta) && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-primary-700 uppercase
                          tracking-wide mb-3">
                            Transporte al centro de faenamiento
                        </p>
                        <div className="space-y-2 text-sm">
                            {data.fechaSalidaCat && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Salida del centro de acopio</span>
                                    <span className="text-gray-800 font-medium">
                                        {new Date(data.fechaSalidaCat)
                                            .toLocaleDateString("es-EC", {
                                                day: "2-digit", month: "long", year: "numeric"
                                            })}
                                    </span>
                                </div>
                            )}
                            {data.fechaLlegadaPlanta && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Llegada a planta</span>
                                    <span className="text-gray-800 font-medium">
                                        {new Date(data.fechaLlegadaPlanta)
                                            .toLocaleDateString("es-EC", {
                                                day: "2-digit", month: "long", year: "numeric"
                                            })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Comercialización — trazabilidad hacia adelante */}
                {data.fechaComercializacion && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-primary-700 uppercase
                          tracking-wide mb-3">
                            Comercialización
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Fecha de despacho</span>
                                <span className="text-gray-800 font-medium">
                                    {new Date(data.fechaComercializacion)
                                        .toLocaleDateString("es-EC", {
                                            day: "2-digit", month: "long", year: "numeric"
                                        })}
                                </span>
                            </div>
                            {data.tipoMercado && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Mercado</span>
                                    <span className="text-gray-800 font-medium text-right
                                   max-w-[60%]">
                                        {data.tipoMercado}
                                        {data.ubicacionMercado && ` · ${data.ubicacionMercado}`}
                                    </span>
                                </div>
                            )}
                            {data.destinoComercial && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Destino</span>
                                    <span className="text-gray-800 font-medium text-right
                                   max-w-[60%]">
                                        {data.destinoComercial}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-gray-400 pb-4 space-y-1">
                    <p>COOPAGCUY · Azuay, Ecuador</p>
                    <p>Proyecto Familias Campesinas Liderando</p>
                    <p>Financiado por la Comisión Europea · Ayuda en Acción</p>
                </div>
            </div>
        </div>
    );
}