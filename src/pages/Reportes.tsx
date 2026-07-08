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

export default function Reportes() {
    const [tab, setTab] = useState<Tab>("entrada");
    const [desde, setDesde] = useState(inicioMes());
    const [hasta, setHasta] = useState(hoy());
    const [cat, setCat] = useState<CentroAcopio | "">("");
    const [exportando, setExportando] = useState(false);

    const filtro = { desde, hasta, cat: cat || undefined };

    const { data: prodData = [], isLoading: loadingProd } = useQuery({
        queryKey: ["reporte_productoras", desde, hasta, cat],
        queryFn: () => reportesApi.porProductora(filtro),
        enabled: tab === "productoras",
    });

    const { data: catData = [], isLoading: loadingCat } = useQuery({
        queryKey: ["reporte_cat", desde, hasta, cat],
        queryFn: () => reportesApi.porCAT(filtro),
        enabled: tab === "cat",
    });

    const { data: novData = [], isLoading: loadingNov } = useQuery({
        queryKey: ["reporte_novedades", desde, hasta, cat],
        queryFn: () => reportesApi.novedades(filtro),
        enabled: tab === "novedades",
    });

    const { data: devData, isLoading: loadingDev, isError: errorDev } = useQuery({
        queryKey: ["reporte_devoluciones", desde, hasta, cat],
        queryFn: () => reportesApi.devoluciones(filtro),
        enabled: tab === "devoluciones",
    });

    const { data: entradaData = [], isLoading: loadingEntrada } = useQuery({
        queryKey: ["reporte_entrada", desde, hasta, cat],
        queryFn: () => reportesApi.entrada(filtro),
        enabled: tab === "entrada",
    });

    const { data: transitoData = [], isLoading: loadingTransito } = useQuery({
        queryKey: ["reporte_transito", desde, hasta, cat],
        queryFn: () => reportesApi.transito(filtro),
        enabled: tab === "transito",
    });

    const { data: salidaData = [], isLoading: loadingSalida } = useQuery({
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
                <button
                    onClick={handleExportar}
                    disabled={exportando}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white text-sm
                       font-medium rounded-lg transition"
                >
                    {exportando ? "Exportando..." : "Exportar a Excel"}
                </button>
            </div>

            <div className="mb-5">
                <FiltrosPeriodo
                    desde={desde} hasta={hasta} cat={cat}
                    onDesdeChange={setDesde}
                    onHastaChange={setHasta}
                    onCatChange={setCat}
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
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
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition
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
                    {loadingEntrada ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando reporte...
                        </div>
                    ) : entradaData.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No hay cuyes en espera de faenamiento en el período.
                        </div>
                    ) : (
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
                    )}
                </div>
            )}

            {/* Tab: Tránsito — lotes faenados completos */}
            {tab === "transito" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    {loadingTransito ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando reporte...
                        </div>
                    ) : transitoData.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No hay lotes faenados en el período.
                        </div>
                    ) : (
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
                    )}
                </div>
            )}

            {/* Tab: Salida — despachos con chofer/ruta/cliente */}
            {tab === "salida" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    {loadingSalida ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando reporte...
                        </div>
                    ) : salidaData.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No hay despachos en el período.
                        </div>
                    ) : (
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
                    )}
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
                    {loadingProd ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando reporte...
                        </div>
                    ) : prodData.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No hay datos para el período seleccionado.
                        </div>
                    ) : (
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
                    )}
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
                    {loadingCat ? (
                        <p className="text-sm text-gray-400 col-span-full text-center py-8">
                            Cargando reporte...
                        </p>
                    ) : catData.length === 0 ? (
                        <p className="text-sm text-gray-400 col-span-full text-center py-8">
                            No hay datos para el período seleccionado.
                        </p>
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
                    {loadingNov ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando reporte...
                        </div>
                    ) : novData.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No hay novedades registradas en el período.
                        </div>
                    ) : (
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
                    )}
                </div>
            )}
        </MainLayout>
    );
}