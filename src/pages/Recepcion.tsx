import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { recepcionApi } from "../api/recepcion";
import { pagosApi } from "../api/pagos";
import { imprimirTicket } from "../api/imprimirTicket";
import { offlineDB } from "../services/db";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";
import { Segmentado } from "../components/ui/Segmentado";
import { SyncStatus } from "../components/ui/SyncStatus";
import { FormLote } from "../components/recepcion/FormLote";
import { FormMovilizacion } from "../components/recepcion/FormMovilizacion";
import { FormVentaLocal } from "../components/recepcion/FormVentaLocal";
import { FormPago } from "../components/recepcion/FormPago";
import { VerificarPago } from "../components/recepcion/VerificarPago";
import { JaulaEnArmado } from "../components/recepcion/JaulaEnArmado";
import { EvidenciaNovedad } from "../components/ui/EvidenciaNovedad";
import { descargarBlob } from "../utils/download";
import type { EstadoLote, Lote, EntregaOffline, SyncResult } from "../types/recepcion";
import type { Pago } from "../types/productora";

const estadoBadge = (e: EstadoLote) => {
    if (e === "Aceptado") return <Badge label="Aceptado" variant="success" />;
    if (e === "ConNovedad") return <Badge label="Con novedad" variant="warning" />;
    return <Badge label="Rechazado" variant="danger" />;
};

// Estado del pago tal como lo necesita esta lista: no solo "hubo pago", sino
// si a esta CAT le toca verificarlo todavía. Una venta local nace
// "Recibido" sin pasar por la bandeja de la planta — no es un pago de
// planta ya verificado y no debe leerse igual en esta tabla.
const estadoPagoBadge = (p: Pago) => {
    if (p.estado === "Pendiente") return <Badge label="Pendiente" variant="neutral" />;
    if (p.estado === "Pagado") return <Badge label="Por verificar" variant="warning" />;
    if (p.esVentaLocal) return <Badge label="Venta local" variant="info" />;
    return <Badge label="Recibido" variant="success" />;
};

export default function Recepcion() {
    const qc = useQueryClient();
    const sync = useOfflineSync();
    const { isOnline, syncing, pendientes, actualizarConteo } = sync;

    const [showForm, setShowForm] = useState(false);
    const [showFormPago, setShowFormPago] = useState(false);
    const [loteMovilizar, setLoteMovilizar] = useState<Lote | null>(null);
    const [loteVentaLocal, setLoteVentaLocal] = useState<Lote | null>(null);
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

    // Tickets que la planta ya pagó y esta CAT todavía no ha verificado. El
    // servidor ya acota por centro, así que no hay que filtrar aquí.
    const porVerificar = pagos.filter((p) => p.estado === "Pagado").length;

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

    // Reimprimir desde la lista: a diferencia del ticket automático del
    // registro, aquí un fallo (popup bloqueado, red, sesión expirada) no
    // tiene un pago recién creado detrás — solo se avisa para que la
    // operadora reintente.
    const handleReimprimirTicket = async (pagoId: number) => {
        try {
            await imprimirTicket(pagoId);
        } catch {
            window.alert("No se pudo imprimir el ticket. Intenta de nuevo.");
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
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 shrink-0
                       bg-primary-600 hover:bg-primary-700
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

            <div className="mb-5">
                <Segmentado
                    activo={tabActual}
                    onCambio={setTabActual}
                    opciones={[
                        { id: "server", label: "Sincronizados" },
                        {
                            id: "local", label: `Sin sincronizar${pendientes > 0
                                ? ` (${pendientes})` : ""}`
                        },
                        {
                            id: "pagos", label: porVerificar > 0
                                ? `Pagos (${porVerificar})` : "Pagos"
                        },
                    ]}
                />
            </div>

            {/* Tab: lotes del servidor */}
            {tabActual === "server" && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    {!isOnline ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Sin conexión. Cambia a la pestaña "Sin sincronizar" para ver
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
                                            {/* Las novedades con evidencia son siempre
                                                clínicas: es lo que se reclama al
                                                proveedor, así que se enlaza aquí. */}
                                            {l.novedades.filter(n => n.tieneFoto).map(n => (
                                                <span key={n.id} className="block mt-1">
                                                    <EvidenciaNovedad novedadId={n.id} />
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                                            {/* Contra cantidadAnimales, NO contra cuyes.length: una
                                                jaula histórica cargada sin detalle por animal tiene
                                                Cuyes vacío, así que cuyesVendidosLocal < cuyes.length
                                                sería 0 < 0 (false) y el botón desaparecería de un lote
                                                que el backend sí deja enviar. cantidadAnimales es el
                                                dato autoritativo del lote (lo usa el resto de esta
                                                pantalla, p. ej. disponibles < cantidadAnimales) y es
                                                el mismo criterio que ya protege este caso en
                                                MovilizacionService (resta en vez de contar) y en
                                                PagoService.ListarLotesPendientesAsync. */}
                                            {l.estado !== "Rechazado" && l.cerrado &&
                                                !l.tieneMovilizacion &&
                                                l.cuyesVendidosLocal < l.cantidadAnimales && (
                                                    <button
                                                        onClick={() => setLoteMovilizar(l)}
                                                        title="Registrar salida hacia la planta"
                                                        className="text-xs font-semibold text-bayo-700
                                     hover:text-bayo-600"
                                                    >
                                                        A planta
                                                    </button>
                                                )}
                                            {/* Aquí sí compara contra cuyes.length: vender exige
                                                registro por animal (FormVentaLocal consulta esa
                                                lista aparte) y si está vacía no hay nada que ofrecer. */}
                                            {l.estado !== "Rechazado" && l.cerrado &&
                                                !l.tieneMovilizacion &&
                                                l.cuyesVendidosLocal < l.cuyes.length && (
                                                    <button
                                                        onClick={() => setLoteVentaLocal(l)}
                                                        title="Registrar una venta en la comunidad"
                                                        className="text-xs font-semibold text-primary-700
                                     hover:text-primary-600"
                                                    >
                                                        Vender local
                                                    </button>
                                                )}
                                            {l.tieneMovilizacion && (
                                                <span className="text-xs text-gray-400"
                                                    title="El lote ya fue enviado a la planta">
                                                    Enviado ✓
                                                </span>
                                            )}
                                            {/* Vendido entero: no queda nada que
                                                enviar ni que vender. La guía sigue
                                                disponible, y ahora además lista lo
                                                que se quedó en la comunidad. Compara
                                                contra cuyes.length (no cantidadAnimales)
                                                a propósito: en una jaula histórica sin
                                                detalle por animal cuyesVendidosLocal
                                                también es 0, así que "> 0" ya la
                                                descarta antes de llegar al 0 === 0. */}
                                            {l.cuyesVendidosLocal > 0 &&
                                                l.cuyesVendidosLocal === l.cuyes.length && (
                                                    <span className="text-xs font-bold text-primary-700"
                                                        title="Todo el lote se vendió en la comunidad">
                                                        Venta local
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
                                                    <p className="text-xs text-teja-500 mt-1">
                                                        Error: {l._error}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge
                                                label={
                                                    l._estado === "pendiente" ? "Pendiente" :
                                                        l._estado === "sincronizado" ? "Sincronizado" :
                                                            l._estado === "en_revision" ? "En revisión" :
                                                                "Error"
                                                }
                                                variant={
                                                    l._estado === "pendiente" ? "warning" :
                                                        l._estado === "sincronizado" ? "success" :
                                                            l._estado === "en_revision" ? "info" :
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
                                        {["Productora", "Lote", "Monto", "Estado",
                                            "Fecha", "Responsable", ""].map(h => (
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
                                        <Fragment key={p.id}>
                                            <tr className={"hover:bg-gray-50 transition"
                                                + (p.estado === "Pagado" ? " bg-primary-50/50" : "")}>
                                                <td className="px-4 py-3 font-medium text-gray-800">
                                                    {p.nombreProductora}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                    {p.codigoLote ?? "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-primary-700">
                                                        ${p.montoUsd.toFixed(2)}
                                                    </div>
                                                    {/* Solo se muestra cuando difiere del ticket: es la
                                                        prueba de que hubo descuento, no un dato repetido. */}
                                                    {p.montoPagadoUsd !== null
                                                        && p.montoPagadoUsd !== p.montoUsd && (
                                                            <div className="text-xs text-bayo-700 font-semibold">
                                                                Pagado: ${p.montoPagadoUsd.toFixed(2)}
                                                            </div>
                                                        )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {estadoPagoBadge(p)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {new Date(p.fechaPago).toLocaleDateString("es-EC")}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {p.responsable}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleReimprimirTicket(p.id)}
                                                        title="Reimprimir el ticket"
                                                        className="min-h-[44px] px-3 rounded-xl
                                                            border-2 border-gray-200 bg-white
                                                            text-xs font-bold text-gray-700
                                                            hover:bg-gray-50 active:scale-95
                                                            transition"
                                                    >
                                                        🧾 Ticket
                                                    </button>
                                                </td>
                                            </tr>
                                            {p.estado === "Pagado" && (
                                                <tr>
                                                    <td colSpan={7} className="px-3 pb-3">
                                                        <VerificarPago pago={p} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
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
            {loteVentaLocal && (
                <FormVentaLocal
                    lote={loteVentaLocal}
                    onClose={() => setLoteVentaLocal(null)}
                />
            )}
            {showFormPago && (
                <FormPago onClose={() => setShowFormPago(false)} />
            )}
        </MainLayout>
    );
}