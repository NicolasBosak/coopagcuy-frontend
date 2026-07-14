import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportesApi } from "../api/reportes";
import { descargarBlob } from "../utils/download";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";
import { FiltrosPeriodo } from "../components/reportes/FiltrosPeriodo";
import { BarrasCalidad, type FilaBarras } from "../components/reportes/graficos/BarrasCalidad";
import { AnilloNovedades } from "../components/reportes/graficos/AnilloNovedades";
import { AnilloConteos } from "../components/reportes/graficos/AnilloConteos";
import type { CentroAcopio } from "../types/productora";

type Tab = "entrada" | "transito" | "salida"
    | "productoras" | "cat" | "novedades" | "devoluciones";

function inicioMes() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
        .toISOString().slice(0, 10);
}
function hoy() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Estados de un panel de reporte.
 *
 * Antes cada pestaña colapsaba "falló la petición" y "no hay datos" en el
 * mismo mensaje gris: un 403, un 500 o un corte de red se leían como
 * "No hay lotes faenados en el período". Por eso el reporte de tránsito se
 * reportó como bug sin que nadie pudiera ver qué pasaba realmente.
 *
 * `pista` explica qué paso del flujo alimenta el panel, para que un vacío
 * legítimo no se confunda con el sistema roto.
 */
function PanelEstado({
    cargando, error, vacio, mensajeVacio, pista, children,
}: {
    cargando: boolean;
    error: boolean;
    vacio: boolean;
    mensajeVacio: string;
    pista?: string;
    children: React.ReactNode;
}) {
    if (cargando)
        return (
            <div className="p-8 text-center text-sm text-gray-400">
                Cargando reporte...
            </div>
        );

    if (error)
        return (
            <div className="p-8 text-center">
                <p className="text-sm font-semibold text-teja-700">
                    No se pudo cargar el reporte.
                </p>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                    Hubo un problema al consultar el servidor. Revisa tu conexión
                    e intenta de nuevo; si continúa, avisa al administrador.
                </p>
            </div>
        );

    if (vacio)
        return (
            <div className="p-8 text-center">
                <p className="text-sm text-gray-500">{mensajeVacio}</p>
                {pista && (
                    <p className="mt-1.5 text-xs text-gray-400 max-w-md mx-auto">
                        {pista}
                    </p>
                )}
            </div>
        );

    return <>{children}</>;
}

export default function Reportes() {
    const [tab, setTab] = useState<Tab>("entrada");
    const [desde, setDesde] = useState(inicioMes());
    const [hasta, setHasta] = useState(hoy());
    const [cat, setCat] = useState<CentroAcopio | "">("");
    const [exportando, setExportando] = useState(false);
    const [exportandoGeneral, setExportandoGeneral] = useState(false);

    const filtro = { desde, hasta, cat: cat || undefined };

    const { data: prodData = [], isLoading: loadingProd, isError: errorProd } = useQuery({
        queryKey: ["reporte_productoras", desde, hasta, cat],
        queryFn: () => reportesApi.porProductora(filtro),
        enabled: tab === "productoras",
    });

    const { data: catData = [], isLoading: loadingCat, isError: errorCat } = useQuery({
        queryKey: ["reporte_cat", desde, hasta, cat],
        queryFn: () => reportesApi.porCAT(filtro),
        enabled: tab === "cat",
    });

    const { data: novData = [], isLoading: loadingNov, isError: errorNov } = useQuery({
        queryKey: ["reporte_novedades", desde, hasta, cat],
        queryFn: () => reportesApi.novedades(filtro),
        enabled: tab === "novedades",
    });

    const { data: devData, isLoading: loadingDev, isError: errorDev } = useQuery({
        queryKey: ["reporte_devoluciones", desde, hasta, cat],
        queryFn: () => reportesApi.devoluciones(filtro),
        enabled: tab === "devoluciones",
    });

    const { data: entradaData = [], isLoading: loadingEntrada, isError: errorEntrada } = useQuery({
        queryKey: ["reporte_entrada", desde, hasta, cat],
        queryFn: () => reportesApi.entrada(filtro),
        enabled: tab === "entrada",
    });

    const { data: transitoData = [], isLoading: loadingTransito, isError: errorTransito } = useQuery({
        queryKey: ["reporte_transito", desde, hasta, cat],
        queryFn: () => reportesApi.transito(filtro),
        enabled: tab === "transito",
    });

    const { data: salidaData = [], isLoading: loadingSalida, isError: errorSalida } = useQuery({
        queryKey: ["reporte_salida", desde, hasta, cat],
        queryFn: () => reportesApi.salida(filtro),
        enabled: tab === "salida",
    });

    // ── Datos de los gráficos: se recalculan con cada cambio de filtro ──

    const barrasProductoras: FilaBarras[] = useMemo(() =>
        [...prodData]
            .sort((a, b) => b.totalLotes - a.totalLotes)
            .map((r) => ({
                etiqueta: r.nombreProductora,
                sublabel: r.comunidad,
                aceptados: r.lotesAceptados,
                conNovedad: r.lotesConNovedad,
                rechazados: r.lotesRechazados,
            })), [prodData]);

    const barrasCAT: FilaBarras[] = useMemo(() =>
        catData.map((r) => ({
            etiqueta: r.centroAcopio,
            sublabel: `${r.tasaAceptacion}% aceptación`,
            aceptados: r.lotesAceptados,
            conNovedad: r.lotesConNovedad,
            rechazados: r.lotesRechazados,
        })), [catData]);

    const conteoNovedades: Record<string, number> = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const n of novData)
            acc[n.tipoNovedad] = (acc[n.tipoNovedad] ?? 0) + 1;
        return acc;
    }, [novData]);

    const handleExportar = async () => {
        setExportando(true);
        try {
            if (tab === "productoras") {
                const blob = await reportesApi.exportarExcelProductoras(filtro);
                descargarBlob(blob, `Reporte-Productoras-${desde}-${hasta}.xlsx`);
            } else if (tab === "novedades") {
                const blob = await reportesApi.exportarExcelNovedades(filtro);
                descargarBlob(blob, `Reporte-Novedades-${desde}-${hasta}.xlsx`);
            } else if (tab === "cat") {
                const blob = await reportesApi.exportarExcelCAT(filtro);
                descargarBlob(blob, `Reporte-CAT-${desde}-${hasta}.xlsx`);
            } else if (tab === "devoluciones") {
                const blob = await reportesApi.exportarExcelDevoluciones(filtro);
                descargarBlob(blob, `Reporte-Devoluciones-${desde}-${hasta}.xlsx`);
            } else if (tab === "entrada") {
                const blob = await reportesApi.exportarExcelEntrada(filtro);
                descargarBlob(blob, `Reporte-Entrada-${desde}-${hasta}.xlsx`);
            } else if (tab === "transito") {
                const blob = await reportesApi.exportarExcelTransito(filtro);
                descargarBlob(blob, `Reporte-Transito-${desde}-${hasta}.xlsx`);
            } else if (tab === "salida") {
                const blob = await reportesApi.exportarExcelSalida(filtro);
                descargarBlob(blob, `Reporte-Salida-${desde}-${hasta}.xlsx`);
            }
        } finally {
            setExportando(false);
        }
    };

    // Todos los dashboards del período en un libro, una hoja por cada uno
    const handleExportarGeneral = async () => {
        setExportandoGeneral(true);
        try {
            const blob = await reportesApi.exportarExcelGeneral(filtro);
            descargarBlob(blob, `Reporte-General-${desde}-${hasta}.xlsx`);
        } finally {
            setExportandoGeneral(false);
        }
    };

    // ── Agregados para los gráficos de devoluciones ───────────────────

    const motivosDevoluciones: Record<string, number> = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const d of devData?.devolucionesClientes ?? [])
            acc[d.motivo] = (acc[d.motivo] ?? 0) + d.cantidadUnidades;
        for (const r of devData?.retornosProductora ?? [])
            acc[r.motivo] = (acc[r.motivo] ?? 0) + 1;
        return acc;
    }, [devData]);

    const devolucionesPorProductora: Record<string, number> = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const d of devData?.devolucionesClientes ?? [])
            acc[d.nombreProductora] = (acc[d.nombreProductora] ?? 0) + d.cantidadUnidades;
        for (const r of devData?.retornosProductora ?? [])
            acc[r.nombreProductora] = (acc[r.nombreProductora] ?? 0) + 1;
        return acc;
    }, [devData]);

    return (
        <MainLayout>
            <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        Reportes
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Producción, calidad y novedades por período
                    </p>
                </div>
                {/* Dos alcances: la pestaña actual, o todo el período de una
                    vez. El general va en secundario para no competir con la
                    exportación puntual, que es la de uso diario. */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleExportarGeneral}
                        disabled={exportandoGeneral}
                        title="Descarga un solo archivo con una hoja por dashboard"
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 border-2
                       border-primary-600 text-primary-700 hover:bg-primary-50
                       disabled:opacity-50 text-sm font-medium rounded-lg transition"
                    >
                        {exportandoGeneral
                            ? "Exportando todo..."
                            : "Exportar todo"}
                    </button>
                    <button
                        onClick={handleExportar}
                        disabled={exportando}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-primary-600
                       hover:bg-primary-700 disabled:bg-primary-300 text-white
                       text-sm font-medium rounded-lg transition"
                    >
                        {exportando ? "Exportando..." : "Exportar a Excel"}
                    </button>
                </div>
            </div>

            <div className="mb-5">
                <FiltrosPeriodo
                    desde={desde} hasta={hasta} cat={cat}
                    onDesdeChange={setDesde}
                    onHastaChange={setHasta}
                    onCatChange={setCat}
                />
            </div>

            {/* Tabs. Envuelven en lugar de scrollear: son 7 y en un carrusel
                horizontal las últimas quedarían fuera de vista. En móvil ocupa
                el ancho completo; desde sm vuelve a ser una píldora compacta. */}
            <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 mb-5 sm:w-fit">
                {([
                    { id: "entrada", label: "Entrada" },
                    { id: "transito", label: "Tránsito" },
                    { id: "salida", label: "Salida" },
                    { id: "productoras", label: "Por productora" },
                    { id: "cat", label: "Por CAT" },
                    { id: "novedades", label: "Novedades" },
                    { id: "devoluciones", label: "Devoluciones" },
                ] as const).map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        // 44px de alto en táctil (RNF-201); en escritorio se
                        // mantiene la píldora compacta, donde apunta un ratón
                        className={`min-h-[44px] sm:min-h-0 px-4 py-1.5 rounded-md
                        text-sm font-medium transition
                        ${tab === id
                                ? "bg-white text-gray-800 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab: Entrada — cuyes en espera de faenamiento */}
            {tab === "entrada" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <PanelEstado
                        cargando={loadingEntrada}
                        error={errorEntrada}
                        vacio={entradaData.length === 0}
                        mensajeVacio="No hay cuyes en espera de faenamiento en el período."
                        pista="Este panel se llena cuando la planta confirma la llegada de
                               una jaula. Registrar la entrega y el envío desde el CAT no
                               basta: falta confirmar la recepción en planta."
                    >
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Código lote", "CAT", "Productora", "Comunidad",
                                        "En espera", "Fecha de llegada"].map(h => (
                                            <th key={h} className="px-3 py-3 text-left text-xs
                                     font-medium text-gray-500 uppercase tracking-wide
                                     whitespace-nowrap">{h}</th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {entradaData.map((r, i) => (
                                    <tr key={`${r.codigoLote}-${i}`} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5 font-mono text-xs text-gray-700">
                                            {r.codigoLote}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <Badge label={r.centroAcopio} variant="neutral" />
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-700">{r.productora}</td>
                                        <td className="px-3 py-2.5 text-gray-600">{r.comunidad}</td>
                                        <td className="px-3 py-2.5 text-center font-bold text-primary-700">
                                            {r.cantidadEnEspera}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                                            {new Date(r.fechaLlegada).toLocaleDateString("es-EC")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </PanelEstado>
                </div>
            )}

            {/* Tab: Tránsito — lotes faenados completos */}
            {tab === "transito" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <PanelEstado
                        cargando={loadingTransito}
                        error={errorTransito}
                        vacio={transitoData.length === 0}
                        mensajeVacio="No hay lotes faenados en el período."
                        pista="Este panel se llena al registrar una sesión de faenamiento
                               en la planta. Mientras el faenamiento no se registre, las
                               entregas y llegadas no aparecen aquí."
                    >
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Lote faenado", "Fecha", "Operario", "Jaulas de origen",
                                        "Comunidades", "Unidades", "Peso prom.", "Estado"].map(h => (
                                            <th key={h} className="px-3 py-3 text-left text-xs
                                     font-medium text-gray-500 uppercase tracking-wide
                                     whitespace-nowrap">{h}</th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transitoData.map((r) => (
                                    <tr key={r.codigoLoteFaenado} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5 font-mono text-xs font-bold
                                       text-primary-800">
                                            {r.codigoLoteFaenado}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                                            {new Date(r.fechaFaenamiento).toLocaleDateString("es-EC")}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-700">{r.operario}</td>
                                        <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                                            {r.jaulasOrigen}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600">{r.comunidades}</td>
                                        <td className="px-3 py-2.5 text-center">{r.unidades}</td>
                                        <td className="px-3 py-2.5 text-gray-600">
                                            {r.pesoPromedioGramos}g
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <Badge label={r.estado}
                                                variant={r.estado === "Apto" ? "success"
                                                    : r.estado === "Rechazado" ? "danger"
                                                        : "warning"} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </PanelEstado>
                </div>
            )}

            {/* Tab: Salida — despachos con chofer/ruta/cliente */}
            {tab === "salida" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <PanelEstado
                        cargando={loadingSalida}
                        error={errorSalida}
                        vacio={salidaData.length === 0}
                        mensajeVacio="No hay despachos en el período."
                        pista="Este panel se llena al registrar un despacho a cliente
                               desde un lote ya faenado."
                    >
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Lote faenado", "Fecha", "Cliente", "Chofer", "Ruta",
                                        "Mercado", "Unidades", "Responsable"].map(h => (
                                            <th key={h} className="px-3 py-3 text-left text-xs
                                     font-medium text-gray-500 uppercase tracking-wide
                                     whitespace-nowrap">{h}</th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {salidaData.map((r, i) => (
                                    <tr key={`${r.codigoLoteFaenado}-${i}`} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5 font-mono text-xs font-bold
                                       text-primary-800">
                                            {r.codigoLoteFaenado}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                                            {new Date(r.fechaDespacho).toLocaleDateString("es-EC")}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-700">{r.cliente}</td>
                                        <td className="px-3 py-2.5 text-gray-600">{r.chofer}</td>
                                        <td className="px-3 py-2.5 text-gray-600">{r.ruta}</td>
                                        <td className="px-3 py-2.5">
                                            <Badge label={r.tipoMercado}
                                                variant={r.tipoMercado === "Internacional" ? "warning"
                                                    : r.tipoMercado === "Nacional" ? "neutral"
                                                        : "success"} />
                                            {r.ubicacion !== "—" && (
                                                <span className="block text-xs text-gray-400 mt-0.5">
                                                    {r.ubicacion}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">{r.unidades}</td>
                                        <td className="px-3 py-2.5 text-gray-600">{r.responsable}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </PanelEstado>
                </div>
            )}

            {/* Tab: Por productora */}
            {tab === "productoras" && !loadingProd && prodData.length > 0 && (
                <div className="mb-5 animate-fade-in-up">
                    <BarrasCalidad
                        titulo="Cuyes por productora en el período"
                        filas={barrasProductoras}
                        unidad="cuyes"
                    />
                </div>
            )}
            {tab === "productoras" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <PanelEstado
                        cargando={loadingProd}
                        error={errorProd}
                        vacio={prodData.length === 0}
                        mensajeVacio="No hay datos para el período seleccionado."
                    >
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Productora", "Comunidad", "CAT", "Lotes", "Animales",
                                        "Aceptados", "Novedad", "Rechazados", "Peso prom.",
                                        "Última entrega"].map(h => (
                                            <th key={h}
                                                className="px-3 py-3 text-left text-xs font-medium
                                 text-gray-500 uppercase tracking-wide
                                 whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {prodData.map((r) => (
                                    <tr key={r.productoraId} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5 font-medium text-gray-800">
                                            {r.nombreProductora}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600">{r.comunidad}</td>
                                        <td className="px-3 py-2.5">
                                            <Badge label={r.centroAcopio} variant="neutral" />
                                        </td>
                                        <td className="px-3 py-2.5 text-center">{r.totalLotes}</td>
                                        <td className="px-3 py-2.5 text-center">{r.totalAnimales}</td>
                                        <td className="px-3 py-2.5 text-center text-green-700">
                                            {r.lotesAceptados}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-yellow-700">
                                            {r.lotesConNovedad}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-red-700">
                                            {r.lotesRechazados}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600">
                                            {r.pesoPromedioGramos}g
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                                            {r.ultimaEntrega
                                                ? new Date(r.ultimaEntrega).toLocaleDateString("es-EC")
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </PanelEstado>
                </div>
            )}

            {/* Tab: Por CAT */}
            {tab === "cat" && !loadingCat && catData.length > 0 && (
                <div className="mb-5 animate-fade-in-up">
                    <BarrasCalidad
                        titulo="Lotes por centro de acopio en el período"
                        filas={barrasCAT}
                        maxFilas={5}
                    />
                </div>
            )}
            {tab === "cat" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loadingCat || errorCat || catData.length === 0 ? (
                        <div className="col-span-full">
                            <PanelEstado
                                cargando={loadingCat}
                                error={errorCat}
                                vacio={catData.length === 0}
                                mensajeVacio="No hay datos para el período seleccionado."
                            >
                                {null}
                            </PanelEstado>
                        </div>
                    ) : (
                        catData.map((r) => (
                            <div key={r.centroAcopio}
                                className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <Badge label={r.centroAcopio} variant="neutral" />
                                    <span className="text-2xl font-semibold text-gray-800">
                                        {r.tasaAceptacion}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mb-3">tasa de aceptación</p>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Lotes totales</span>
                                        <span className="font-medium text-gray-800">{r.totalLotes}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Animales</span>
                                        <span className="font-medium text-gray-800">{r.totalAnimales}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-600">Aceptados</span>
                                        <span className="font-medium text-green-700">{r.lotesAceptados}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-yellow-600">Con novedad</span>
                                        <span className="font-medium text-yellow-700">{r.lotesConNovedad}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-red-600">Rechazados</span>
                                        <span className="font-medium text-red-700">{r.lotesRechazados}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab: Devoluciones y retornos */}
            {tab === "devoluciones" && (
                <div className="space-y-5 animate-fade-in-up">
                    {loadingDev ? (
                        <div className="bg-white rounded-xl border border-gray-200
                            p-8 text-center text-sm text-gray-400">
                            Cargando devoluciones...
                        </div>
                    ) : errorDev || !devData ? (
                        <div className="bg-teja-50 border border-teja-100 rounded-xl
                            p-6 text-center text-sm text-teja-700">
                            No se pudo cargar el reporte de devoluciones.
                            Verifica que el servidor esté en línea e intenta de nuevo.
                        </div>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    ["Devoluciones de clientes", devData.totalDevolucionesClientes],
                                    ["Unidades devueltas", devData.totalUnidadesDevueltas],
                                    ["Retornos a productoras", devData.totalRetornosProductora],
                                ].map(([k, v]) => (
                                    <div key={k as string}
                                        className="bg-white rounded-2xl border border-gray-200
                               px-4 py-3">
                                        <p className="text-2xl font-extrabold text-teja-600">{v}</p>
                                        <p className="text-[11px] font-bold uppercase tracking-wide
                                      text-gray-400">{k}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Gráficos: motivos + productoras */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <AnilloConteos
                                    titulo="Motivos de devolución"
                                    conteos={motivosDevoluciones}
                                    unidad="unidades"
                                    vacio="Sin devoluciones en este período. ¡Buen trabajo!"
                                />
                                <AnilloConteos
                                    titulo="Devoluciones por productora"
                                    conteos={devolucionesPorProductora}
                                    unidad="unidades"
                                    vacio="Ninguna productora registra devoluciones."
                                />
                            </div>

                            {/* Tabla devoluciones de clientes */}
                            {devData.devolucionesClientes.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200
                                overflow-hidden">
                                    <p className="px-4 pt-4 pb-2 text-xs font-bold uppercase
                                  tracking-wide text-gray-500">
                                        Devoluciones de clientes
                                    </p>
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-y border-gray-200">
                                            <tr>
                                                {["Lote", "Sesión", "Productora", "Cliente",
                                                    "Unidades", "Motivo", "Fecha"].map(h => (
                                                        <th key={h}
                                                            className="px-3 py-2.5 text-left text-xs
                                       font-medium text-gray-500 uppercase
                                       tracking-wide">
                                                            {h}
                                                        </th>
                                                    ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {devData.devolucionesClientes.map((d) => (
                                                <tr key={d.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2.5 font-mono text-xs
                                         text-gray-700">
                                                        {d.codigoLote}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs font-bold
                                         text-primary-700">
                                                        {d.numeroSesion ? `F${d.numeroSesion}` : "—"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-700">
                                                        {d.nombreProductora}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-600">
                                                        {d.clienteDevuelve}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center text-gray-600">
                                                        {d.cantidadUnidades}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-600">{d.motivo}</td>
                                                    <td className="px-3 py-2.5 text-gray-500 text-xs">
                                                        {new Date(d.fechaDevolucion)
                                                            .toLocaleDateString("es-EC")}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Tabla retornos a productora */}
                            {devData.retornosProductora.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200
                                overflow-hidden">
                                    <p className="px-4 pt-4 pb-2 text-xs font-bold uppercase
                                  tracking-wide text-gray-500">
                                        Retornos a productoras (desde la planta)
                                    </p>
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-y border-gray-200">
                                            <tr>
                                                {["Lote", "Cuy N°", "Productora", "Motivo",
                                                    "Fecha", "Responsable"].map(h => (
                                                        <th key={h}
                                                            className="px-3 py-2.5 text-left text-xs
                                       font-medium text-gray-500 uppercase
                                       tracking-wide">
                                                            {h}
                                                        </th>
                                                    ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {devData.retornosProductora.map((r) => (
                                                <tr key={r.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2.5 font-mono text-xs
                                         text-gray-700">
                                                        {r.codigoLote}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center font-bold
                                         text-gray-700">
                                                        #{r.numeroEnLote}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-700">
                                                        {r.nombreProductora}
                                                        <span className="block text-xs text-gray-400">
                                                            {r.comunidad}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-600">{r.motivo}</td>
                                                    <td className="px-3 py-2.5 text-gray-500 text-xs">
                                                        {new Date(r.fechaRetorno)
                                                            .toLocaleDateString("es-EC")}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-600">
                                                        {r.responsable}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {devData.devolucionesClientes.length === 0 &&
                                devData.retornosProductora.length === 0 && (
                                    <div className="bg-white rounded-xl border border-gray-200
                                  p-8 text-center text-sm text-gray-400">
                                        No hay devoluciones ni retornos en este período.
                                    </div>
                                )}
                        </>
                    )}
                </div>
            )}

            {/* Tab: Novedades */}
            {tab === "novedades" && !loadingNov && novData.length > 0 && (
                <div className="mb-5 animate-fade-in-up">
                    <AnilloNovedades conteos={conteoNovedades} />
                </div>
            )}
            {tab === "novedades" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <PanelEstado
                        cargando={loadingNov}
                        error={errorNov}
                        vacio={novData.length === 0}
                        mensajeVacio="No hay novedades registradas en el período."
                    >
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Lote", "Productora", "CAT", "Tipo", "Descripción",
                                        "Fecha", "Registrado por"].map(h => (
                                            <th key={h}
                                                className="px-3 py-3 text-left text-xs font-medium
                                 text-gray-500 uppercase tracking-wide
                                 whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {novData.map((n) => (
                                    <tr key={n.novedadId} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5 font-mono text-xs text-gray-700">
                                            {n.codigoLote}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-700">
                                            {n.nombreProductora}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <Badge label={n.centroAcopio} variant="neutral" />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <Badge label={n.tipoNovedad} variant="warning" />
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600 max-w-xs">
                                            {n.descripcion}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                                            {new Date(n.fechaRegistro).toLocaleDateString("es-EC")}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600">
                                            {n.registradoPor}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </PanelEstado>
                </div>
            )}
        </MainLayout>
    );
}