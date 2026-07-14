import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recepcionApi } from "../api/recepcion";
import { pagosApi } from "../api/productoras";
import { offlineDB } from "../services/db";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";
import { SyncStatus } from "../components/ui/SyncStatus";
import { FormLote } from "../components/recepcion/FormLote";
import { FormMovilizacion } from "../components/recepcion/FormMovilizacion";
import { FormPago } from "../components/recepcion/FormPago";
import { JaulaEnArmado } from "../components/recepcion/JaulaEnArmado";
import { descargarBlob } from "../utils/download";
import type { EstadoLote, Lote, EntregaOffline, SyncResult } from "../types/recepcion";

const estadoBadge = (e: EstadoLote) => {
    if (e === "Aceptado") return <Badge label="Aceptado" variant="success" />;
    if (e === "ConNovedad") return <Badge label="Con novedad" variant="warning" />;
    return <Badge label="Rechazado" variant="danger" />;
};

export default function Recepcion() {
    const qc = useQueryClient();
    const sync = useOfflineSync();
    const { isOnline, syncing, pendientes, actualizarConteo } = sync;

    const [showForm, setShowForm] = useState(false);
    const [showFormPago, setShowFormPago] = useState(false);
    const [loteMovilizar, setLoteMovilizar] = useState<Lote | null>(null);
    const [tabActual, setTabActual] = useState<"server" | "local" | "pagos">("server");

    const { data: lotes = [], isLoading } = useQuery({
        queryKey: ["lotes"],
        queryFn: () => recepcionApi.listarLotes(),
        enabled: isOnline,
    });

    const { data: lotesOffline = [], refetch: refetchOffline } = useQuery({
        queryKey: ["lotes_offline"],
        queryFn: (): Promise<EntregaOffline[]> => offlineDB.obtenerTodos(),
    });

    const { data: pagos = [], isLoading: cargandoPagos } = useQuery({
        queryKey: ["pagos"],
        queryFn: () => pagosApi.listar(),
        enabled: tabActual === "pagos" && isOnline,
    });

    const onGuardado = async () => {
        await actualizarConteo();
        if (isOnline) {
            qc.invalidateQueries({ queryKey: ["lotes"] });
        } else {
            refetchOffline();
        }
    };

    const handleSync = async (): Promise<SyncResult | null> => {
        const resultado = await sync.sincronizar();
        qc.invalidateQueries({ queryKey: ["lotes"] });
        refetchOffline();
        return resultado;
    };

    // Descarga la guía de movilización del lote en PDF — RF-210
    const [descargandoGuia, setDescargandoGuia] = useState<string | null>(null);
    const handleGuia = async (codigoLote: string) => {
        setDescargandoGuia(codigoLote);
        try {
            const blob = await recepcionApi.descargarGuia(codigoLote);
            descargarBlob(blob, `Guia-${codigoLote}.pdf`);
        } finally {
            setDescargandoGuia(null);
        }
    };

    return (
        <MainLayout>
            {/* Encabezado */}
            <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">
                        Recepción en CAT
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Registro de lotes por centro de acopio
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <SyncStatus {...sync} sincronizar={handleSync} />
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700
                       text-white text-sm font-medium rounded-lg transition"
                    >
                        + Nuevo lote
                    </button>
                </div>
            </div>

            {/* Banner sin señal */}
            {!isOnline && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl
                        px-4 py-3 text-sm text-yellow-800 mb-5 flex
                        items-start gap-2">
                    <span className="text-base">⚠</span>
                    <span>
                        Sin conexión a internet. Los lotes registrados se guardarán
                        localmente y se sincronizarán automáticamente al recuperar la señal.
                    </span>
                </div>
            )}

            {/* Jaula en armado del CAT */}
            <JaulaEnArmado isOnline={isOnline} />

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
                {([
                    { id: "server", label: "Sincronizados" },
                    {
                        id: "local", label: `Locales${pendientes > 0
                            ? ` (${pendientes})` : ""}`
                    },
                    { id: "pagos", label: "Pagos" },
                ] as const).map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setTabActual(id)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition
                        ${tabActual === id
                                ? "bg-white text-gray-800 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab: lotes del servidor */}
            {tabActual === "server" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    {!isOnline ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Sin conexión. Cambia a la pestaña "Locales" para ver
                            los lotes guardados.
                        </div>
                    ) : isLoading ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando lotes...
                        </div>
                    ) : lotes.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No hay lotes registrados aún.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Código lote", "Productora", "CAT", "Animales",
                                        "Peso prom.", "Estado", "Jaula", "Novedades", ""].map(h => (
                                            <th key={h}
                                                className="px-4 py-3 text-left text-xs font-medium
                                 text-gray-500 uppercase tracking-wide">
                                                {h}
                                            </th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {lotes.map((l) => (
                                    <tr key={l.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                                            {l.codigoLote}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {l.nombreProductora}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge label={l.centroAcopio} variant="neutral" />
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-center">
                                            {l.cantidadAnimales}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {l.cantidadAnimales > 0
                                                ? `${Math.round(
                                                    l.pesoTotalGramos / l.cantidadAnimales)}g`
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3">{estadoBadge(l.estado)}</td>
                                        <td className="px-4 py-3">
                                            {l.cerrado ? (
                                                <span className="text-xs text-gray-500">
                                                    Cerrada
                                                    {l.disponibles < l.cantidadAnimales && (
                                                        <span className="block text-[10px] text-gray-400">
                                                            saldo {l.disponibles}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs
                                       font-bold text-bayo-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-bayo-500
                                         animate-pulse" />
                                                    En armado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {l.novedades.length > 0
                                                ? l.novedades.map(n => n.tipo).join(", ")
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                                            {l.estado !== "Rechazado" && l.cerrado &&
                                                !l.tieneMovilizacion && (
                                                    <button
                                                        onClick={() => setLoteMovilizar(l)}
                                                        title="Registrar salida hacia la planta"
                                                        className="text-xs font-semibold text-bayo-700
                                     hover:text-bayo-600"
                                                    >
                                                        A planta
                                                    </button>
                                                )}
                                            {l.tieneMovilizacion && (
                                                <span className="text-xs text-gray-400"
                                                    title="El lote ya fue enviado a la planta">
                                                    Enviado ✓
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleGuia(l.codigoLote)}
                                                disabled={descargandoGuia === l.codigoLote}
                                                title="Descargar guía de movilización (PDF)"
                                                className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800 disabled:text-gray-300"
                                            >
                                                {descargandoGuia === l.codigoLote
                                                    ? "Generando…" : "Guía PDF"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Tab: lotes locales offline */}
            {tabActual === "local" && (
                <div className="space-y-3">
                    {lotesOffline.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200
                            p-8 text-center text-sm text-gray-400">
                            No hay lotes guardados localmente.
                        </div>
                    ) : (
                        <>
                            {isOnline && pendientes > 0 && !syncing && (
                                <div className="bg-bayo-50 border-2 border-bayo-400
                                rounded-2xl px-5 py-4 flex items-center
                                justify-between gap-4 flex-wrap
                                animate-fade-in-up">
                                    <div>
                                        <p className="text-base font-extrabold text-bayo-700">
                                            ⚠ {pendientes} lote{pendientes > 1 ? "s" : ""} esperando
                                            sincronización
                                        </p>
                                        <p className="text-sm text-bayo-700/80 mt-0.5">
                                            Ya hay conexión: envía los registros guardados
                                            en la tablet para no perderlos.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleSync}
                                        className="h-12 px-6 bg-bayo-500 text-white
                               rounded-xl text-sm font-bold hover:bg-bayo-600
                               shadow-md shadow-bayo-500/30 transition
                               active:scale-[0.97]"
                                    >
                                        Sincronizar ahora
                                    </button>
                                </div>
                            )}

                            {lotesOffline.map((l) => {
                                const cantidad = l.cuyes?.length ?? 0;
                                const pesoTotal = (l.cuyes ?? [])
                                    .reduce((acc, c) => acc + (c.pesoGramos || 0), 0);
                                return (
                                    <div key={l._id}
                                        className="bg-white rounded-xl border border-gray-200 p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    Entrega · {l.centroAcopio} · {cantidad} animales
                                                    {cantidad > 0 && (
                                                        <> · {Math.round(pesoTotal / cantidad)}g promedio</>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {new Date(l._fechaCreacion).toLocaleString("es-EC")} ·{" "}
                                                    {l.responsableRecepcion}
                                                </p>
                                                {l._error && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        Error: {l._error}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge
                                                label={
                                                    l._estado === "pendiente" ? "Pendiente" :
                                                        l._estado === "sincronizado" ? "Sincronizado" :
                                                            "Error"
                                                }
                                                variant={
                                                    l._estado === "pendiente" ? "warning" :
                                                        l._estado === "sincronizado" ? "success" :
                                                            "danger"
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}

            {/* Tab: pagos a productoras */}
            {tabActual === "pagos" && (
                <div className="space-y-3 animate-fade-in-up">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowFormPago(true)}
                            disabled={!isOnline}
                            className="h-10 px-4 bg-primary-600 hover:bg-primary-700
                         disabled:bg-gray-300 text-white text-sm
                         font-semibold rounded-xl transition"
                        >
                            + Registrar pago
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                        {!isOnline ? (
                            <div className="p-8 text-center text-sm text-gray-400">
                                Los pagos requieren conexión a internet.
                            </div>
                        ) : cargandoPagos ? (
                            <div className="p-8 text-center text-sm text-gray-400">
                                Cargando pagos…
                            </div>
                        ) : pagos.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-400">
                                Aún no hay pagos registrados. Usa "Registrar pago"
                                para dejar constancia de cada entrega pagada.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {["Productora", "Lote", "Monto", "Método",
                                            "Fecha", "Responsable"].map(h => (
                                                <th key={h}
                                                    className="px-4 py-3 text-left text-xs font-bold
                                   text-gray-500 uppercase tracking-wide">
                                                    {h}
                                                </th>
                                            ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {pagos.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {p.nombreProductora}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                {p.codigoLote ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-primary-700">
                                                ${p.montoUsd.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {p.metodoPago}
                                                {p.numeroDias && p.valorPorDia && (
                                                    <span className="block text-xs text-gray-400">
                                                        {p.numeroDias} días · $
                                                        {p.valorPorDia.toFixed(2)} c/u
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {new Date(p.fechaPago).toLocaleDateString("es-EC")}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {p.responsable}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Modales */}
            {showForm && (
                <FormLote
                    isOnline={isOnline}
                    onGuardado={onGuardado}
                    onClose={() => setShowForm(false)}
                />
            )}
            {loteMovilizar && (
                <FormMovilizacion
                    lote={loteMovilizar}
                    onClose={() => setLoteMovilizar(null)}
                />
            )}
            {showFormPago && (
                <FormPago onClose={() => setShowFormPago(false)} />
            )}
        </MainLayout>
    );
}