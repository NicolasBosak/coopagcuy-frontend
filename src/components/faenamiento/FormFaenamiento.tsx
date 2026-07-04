import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faenamientoApi } from "../../api/faenamiento";
import { useAuth } from "../../context/AuthContext";
import { ModalShell } from "../ui/ModalShell";
import type {
    CuyFaenamientoRequest, EstadoCanal,
    AlertaNovedadPrevia, CuyDisponible,
} from "../../types/faenamiento";

interface Props { onClose: () => void; }

const ESTADOS_CANAL: { valor: EstadoCanal; etiqueta: string; icono: string }[] = [
    { valor: "Apto", etiqueta: "Apto", icono: "✅" },
    { valor: "ConNovedad", etiqueta: "Con novedad", icono: "⚠️" },
    { valor: "Rechazado", etiqueta: "No apto", icono: "🚫" },
];

// Selección editable por cuy dentro de la sesión
interface CuySesion extends CuyFaenamientoRequest {
    incluido: boolean;
    recepcion: CuyDisponible;
}

const TOTAL_PASOS = 4;

const TITULOS: Record<number, { titulo: string; ayuda: string }> = {
    1: { titulo: "¿Cuándo y quién faena?", ayuda: "Datos de esta jornada de planta" },
    2: { titulo: "¿Qué lotes vas a faenar?", ayuda: "Puedes tomar cuyes de varios lotes" },
    3: { titulo: "Pesa y revisa cada cuy", ayuda: "Anota el peso de la canal uno por uno" },
    4: { titulo: "Revisa y guarda", ayuda: "Verifica los totales antes de guardar" },
};

export function FormFaenamiento({ onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const hoy = new Date().toISOString().slice(0, 16);

    const [paso, setPaso] = useState(1);
    const [fechaFaenamiento, setFechaFaenamiento] = useState(hoy);
    const [operario, setOperario] = useState(auth.nombreCompleto ?? "");
    const [temperatura, setTemperatura] = useState<number | undefined>(4);
    const [observaciones, setObservaciones] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [seleccion, setSeleccion] = useState<Record<number, CuySesion[]>>({});
    const [resultado, setResultado] = useState<{
        codigo: string;
        alertas: AlertaNovedadPrevia[];
    } | null>(null);

    const { data: lotesDisponibles = [], isLoading } = useQuery({
        queryKey: ["lotes_disponibles"],
        queryFn: () => faenamientoApi.lotesDisponibles(),
    });

    const toggleLote = (loteId: number, cuyes: CuyDisponible[]) => {
        setSeleccion((prev) => {
            if (prev[loteId]) {
                const { [loteId]: _, ...resto } = prev;
                return resto;
            }
            return {
                ...prev,
                [loteId]: cuyes.map((c) => ({
                    numeroEnLote: c.numeroEnLote,
                    pesoCanalGramos: undefined,
                    estado: "Apto" as EstadoCanal,
                    motivo: "",
                    retornarAProductora: false,
                    incluido: true,
                    recepcion: c,
                })),
            };
        });
    };

    const actualizarCuy = (
        loteId: number, numero: number, cambios: Partial<CuySesion>) => {
        setSeleccion((prev) => ({
            ...prev,
            [loteId]: prev[loteId].map((c) =>
                c.numeroEnLote === numero ? { ...c, ...cambios } : c),
        }));
    };

    // Totales de la cuota sobre los cuyes incluidos
    const incluidos = Object.values(seleccion).flat().filter((c) => c.incluido);
    const noAptos = incluidos.filter((c) => c.estado === "Rechazado");
    const faenados = incluidos.length - noAptos.length;
    const retornados = noAptos.filter((c) => c.retornarAProductora).length;
    const pesoTotal = incluidos
        .filter((c) => c.estado !== "Rechazado")
        .reduce((acc, c) => acc + (c.pesoCanalGramos ?? 0), 0);
    const pesoPromedio = faenados > 0 ? Math.round(pesoTotal / faenados) : 0;

    const lotesElegidos = lotesDisponibles.filter((l) => seleccion[l.loteId]);
    const faltanPeso = incluidos.some(
        (c) => c.estado !== "Rechazado" &&
            (!c.pesoCanalGramos || c.pesoCanalGramos <= 0));

    const puedeAvanzar = () => {
        if (paso === 1) return operario.trim().length > 0 && !!fechaFaenamiento;
        if (paso === 2) return Object.keys(seleccion).length > 0;
        if (paso === 3) return incluidos.length > 0 && !faltanPeso;
        return true;
    };

    const mutation = useMutation({
        mutationFn: () => faenamientoApi.registrarBatch({
            fechaFaenamiento,
            operarioResponsable: operario,
            temperaturaAlmacenamiento: temperatura,
            observaciones: observaciones || undefined,
            lotes: Object.entries(seleccion)
                .map(([loteId, cuyes]) => ({
                    loteId: Number(loteId),
                    cuyes: cuyes
                        .filter((c) => c.incluido)
                        .map(({ incluido, recepcion, ...c }) => ({
                            ...c,
                            motivo: c.motivo?.trim() || undefined,
                        })),
                }))
                .filter((l) => l.cuyes.length > 0),
        }),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["faenamientos"] });
            qc.invalidateQueries({ queryKey: ["lotes_disponibles"] });
            qc.invalidateQueries({ queryKey: ["lotes"] });
            qc.invalidateQueries({ queryKey: ["productoras"] });
            setResultado({
                codigo: data.codigoLoteFaenado,
                alertas: data.alertasNovedadPrevia,
            });
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo registrar el faenamiento.");
        },
    });

    const handleGuardar = () => {
        setError(null);
        if (incluidos.length === 0) {
            setError("Selecciona al menos un cuy para faenar.");
            return;
        }
        if (faltanPeso) {
            setError("Falta el peso de canal de algún cuy.");
            return;
        }
        mutation.mutate();
    };

    const colorPeso = (peso?: number) => {
        if (!peso) return "";
        if (peso >= 907) return "text-green-600";
        if (peso >= 880) return "text-bayo-600";
        return "text-teja-500";
    };

    // ── Pantalla de resultado: código del lote faenado + alertas ─────
    if (resultado) {
        return (
            <ModalShell
                onClose={onClose}
                title="Faenamiento registrado"
                footer={
                    <button
                        onClick={onClose}
                        className="w-full h-12 bg-primary-600 hover:bg-primary-700
                       text-white rounded-2xl text-sm font-bold transition"
                    >
                        Entendido
                    </button>
                }
            >
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm text-gray-500">
                    Todo el producto de esta sesión queda bajo un solo código:
                </p>
                <div className="mt-3 bg-primary-50 border-2 border-primary-200
                        rounded-2xl px-4 py-3 text-center">
                    <p className="font-mono text-xl font-extrabold text-primary-800">
                        {resultado.codigo}
                    </p>
                    <p className="text-xs text-primary-700 mt-0.5">
                        Con este código se generan el QR y la ficha del lote faenado
                    </p>
                </div>

                {resultado.alertas.length > 0 && (
                    <>
                        <p className="text-sm font-bold text-gray-700 mt-4 mb-2">
                            📋 Novedades que ya venían del CAT:
                        </p>
                        <div className="space-y-2">
                            {resultado.alertas.map((a, i) => (
                                <div key={i}
                                    className="bg-bayo-50 border border-bayo-100 rounded-xl
                             px-3 py-2.5">
                                    <p className="text-sm font-bold text-gray-800">
                                        {a.codigoLote} · Cuy #{a.numeroEnLote}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Novedad en recepción: {a.novedadRecepcion}
                                    </p>
                                    <p className="text-xs font-semibold text-bayo-700 mt-0.5">
                                        Enviado por: {a.nombreProductora ?? "Sin registro"}
                                        {a.comunidad && ` (${a.comunidad})`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </ModalShell>
        );
    }

    const { titulo, ayuda } = TITULOS[paso];

    // Encabezado con barra de progreso (mismo patrón que el registro de lote)
    const header = (
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-200
                    bg-white rounded-t-3xl">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-primary-700">
                    Paso {paso} de {TOTAL_PASOS}
                </p>
                <button onClick={onClose} aria-label="Cerrar"
                    className="w-11 h-11 -mr-2 flex items-center justify-center
                     text-gray-400 hover:text-gray-700 text-2xl">✕</button>
            </div>
            <div className="flex gap-1.5 mb-4">
                {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
                    <div key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors
                        ${i < paso ? "bg-primary-600" : "bg-gray-200"}`} />
                ))}
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
                {titulo}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{ayuda}</p>
        </div>
    );

    const footer = (
        <div className="flex gap-3">
            <button
                type="button"
                onClick={() => paso === 1 ? onClose() : setPaso(paso - 1)}
                className="h-14 px-5 sm:px-6 rounded-2xl border-2 border-gray-300
                   text-base font-semibold text-gray-700 hover:bg-gray-50
                   transition active:scale-[0.98]"
            >
                {paso === 1 ? "Cancelar" : "← Atrás"}
            </button>
            {paso < TOTAL_PASOS ? (
                <button
                    type="button"
                    disabled={!puedeAvanzar()}
                    onClick={() => setPaso(paso + 1)}
                    className="flex-1 h-14 rounded-2xl bg-primary-600 text-white
                     text-base font-bold hover:bg-primary-700
                     disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition active:scale-[0.98]"
                >
                    {paso === 3 && faltanPeso
                        ? "Pesa todos los cuyes"
                        : "Siguiente →"}
                </button>
            ) : (
                <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={handleGuardar}
                    className="flex-1 h-14 rounded-2xl bg-primary-600 text-white
                     text-base font-bold hover:bg-primary-700
                     disabled:bg-primary-300 transition active:scale-[0.98]"
                >
                    {mutation.isPending
                        ? "Guardando…"
                        : `✓ Faenar ${incluidos.length} ${incluidos.length === 1
                            ? "cuy" : "cuyes"}`}
                </button>
            )}
        </div>
    );

    return (
        <ModalShell
            onClose={onClose}
            header={header}
            footer={footer}
            maxWidth="max-w-2xl"
            tone="crema"
        >
            <div className="animate-slide-in space-y-4" key={paso}>

                {/* ── Paso 1: datos de la sesión ── */}
                {paso === 1 && (
                    <>
                        <div>
                            <label className="block text-xs font-bold uppercase
                              tracking-wide text-gray-500 mb-1">
                                ¿Quién faena hoy?
                            </label>
                            <input
                                type="text" required value={operario}
                                onChange={(e) => setOperario(e.target.value)}
                                placeholder="Nombre del operario"
                                className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200
                           bg-white text-base focus:border-primary-500
                           focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase
                                tracking-wide text-gray-500 mb-1">
                                    Fecha y hora
                                </label>
                                <input
                                    type="datetime-local" required
                                    value={fechaFaenamiento}
                                    onChange={(e) => setFechaFaenamiento(e.target.value)}
                                    className="w-full h-12 px-3 rounded-2xl border-2 border-gray-200
                             bg-white text-sm focus:border-primary-500
                             focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase
                                tracking-wide text-gray-500 mb-1">
                                    Temperatura del frío (°C)
                                </label>
                                <input
                                    type="number" step={0.1}
                                    value={temperatura ?? ""}
                                    onChange={(e) => setTemperatura(
                                        e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="ej: 4"
                                    className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200
                             bg-white text-base focus:border-primary-500
                             focus:outline-none"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* ── Paso 2: elegir lotes ── */}
                {paso === 2 && (
                    isLoading ? (
                        <p className="text-sm text-gray-400 py-8 text-center">
                            Cargando lotes…
                        </p>
                    ) : lotesDisponibles.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200
                            p-8 text-center">
                            <p className="text-3xl mb-2">📭</p>
                            <p className="text-sm text-gray-500">
                                No hay lotes con animales pendientes de faenar.
                                Confirma primero las llegadas desde los CAT.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {lotesDisponibles.map((lote) => {
                                const elegido = !!seleccion[lote.loteId];
                                const conNovedad = lote.cuyesDisponibles.some(
                                    (c) => c.motivoNovedad);
                                return (
                                    <button
                                        key={lote.loteId}
                                        type="button"
                                        onClick={() => toggleLote(
                                            lote.loteId, lote.cuyesDisponibles)}
                                        className={`w-full min-h-[64px] rounded-2xl border-2
                               px-4 py-3 flex items-center justify-between gap-3
                               text-left transition active:scale-[0.98]
                               ${elegido
                                                ? "border-primary-600 bg-primary-50"
                                                : "border-gray-200 bg-white hover:border-primary-300"}`}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-mono text-sm font-bold text-gray-900">
                                                {lote.codigoLote}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {lote.centroAcopio} ·{" "}
                                                {lote.disponibles} disponibles de{" "}
                                                {lote.cantidadAnimales}
                                            </p>
                                            {conNovedad && (
                                                <p className="text-xs font-semibold text-bayo-700 mt-0.5">
                                                    ⚠ Trae cuyes con novedad del CAT
                                                </p>
                                            )}
                                        </div>
                                        <span className={`w-7 h-7 shrink-0 rounded-lg border-2
                                 flex items-center justify-center text-base
                                 font-bold transition
                                 ${elegido
                                                ? "bg-primary-600 border-primary-600 text-white"
                                                : "border-gray-300 text-transparent"}`}>
                                            ✓
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )
                )}

                {/* ── Paso 3: pesar y revisar cada cuy ── */}
                {paso === 3 && (
                    <div className="space-y-4">
                        {lotesElegidos.map((lote) => (
                            <div key={lote.loteId}>
                                <p className="text-xs font-bold uppercase tracking-wide
                              text-primary-700 mb-2">
                                    {lote.codigoLote} · {lote.centroAcopio}
                                </p>
                                <div className="space-y-2">
                                    {seleccion[lote.loteId].map((c) => (
                                        <div key={c.numeroEnLote}
                                            className={`rounded-2xl border-2 p-3 transition
                                 ${c.incluido
                                                    ? "border-gray-200 bg-white"
                                                    : "border-gray-100 bg-gray-50 opacity-60"}`}>
                                            {/* Encabezado del cuy */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-8 h-8 shrink-0 rounded-full
                                             bg-gray-100 flex items-center
                                             justify-center text-xs font-bold
                                             text-gray-600">
                                                        {c.numeroEnLote}
                                                    </span>
                                                    <span className="text-xs text-gray-500 min-w-0 truncate">
                                                        {Math.round(c.recepcion.pesoGramos)}g recepción
                                                        {c.recepcion.nombreProductora &&
                                                            ` · ${c.recepcion.nombreProductora}`}
                                                    </span>
                                                </div>
                                                <label className="inline-flex items-center gap-1.5
                                           shrink-0 cursor-pointer select-none
                                           text-xs font-semibold text-gray-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={c.incluido}
                                                        onChange={(e) => actualizarCuy(
                                                            lote.loteId, c.numeroEnLote,
                                                            { incluido: e.target.checked })}
                                                        className="w-5 h-5 rounded accent-[#2f6b3a]"
                                                    />
                                                    Faenar
                                                </label>
                                            </div>

                                            {c.recepcion.motivoNovedad && (
                                                <p className="text-xs font-semibold text-bayo-700
                                          mt-1.5 bg-bayo-50 rounded-lg px-2 py-1">
                                                    ⚠ Novedad del CAT: {c.recepcion.motivoNovedad}
                                                </p>
                                            )}

                                            {c.incluido && (
                                                <div className="mt-2.5 space-y-2 animate-fade-in">
                                                    <input
                                                        type="number" min={0} step={10}
                                                        inputMode="numeric"
                                                        disabled={c.estado === "Rechazado"}
                                                        value={c.pesoCanalGramos ?? ""}
                                                        onChange={(e) => actualizarCuy(
                                                            lote.loteId, c.numeroEnLote, {
                                                            pesoCanalGramos: e.target.value
                                                                ? Number(e.target.value) : undefined
                                                        })}
                                                        placeholder="Peso de la canal (g)"
                                                        className={`w-full h-12 px-4 rounded-xl border-2
                                       border-gray-200 text-base font-bold
                                       text-center focus:border-primary-500
                                       focus:outline-none disabled:bg-gray-50
                                       disabled:text-gray-300
                                       ${colorPeso(c.pesoCanalGramos)}`}
                                                    />
                                                    <div className="grid grid-cols-3 gap-1.5">
                                                        {ESTADOS_CANAL.map(({ valor, etiqueta, icono }) => (
                                                            <button
                                                                key={valor}
                                                                type="button"
                                                                onClick={() => actualizarCuy(
                                                                    lote.loteId, c.numeroEnLote, {
                                                                    estado: valor,
                                                                    retornarAProductora:
                                                                        valor === "Rechazado"
                                                                            ? c.retornarAProductora : false,
                                                                })}
                                                                className={`h-11 rounded-xl text-xs font-bold
                                           transition active:scale-[0.97]
                                           ${c.estado === valor
                                                                        ? valor === "Apto"
                                                                            ? "bg-primary-600 text-white"
                                                                            : valor === "ConNovedad"
                                                                                ? "bg-bayo-500 text-white"
                                                                                : "bg-teja-500 text-white"
                                                                        : "bg-gray-100 text-gray-500"}`}
                                                            >
                                                                <span className="block text-sm">{icono}</span>
                                                                {etiqueta}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {c.estado !== "Apto" && (
                                                        <input
                                                            type="text"
                                                            value={c.motivo ?? ""}
                                                            onChange={(e) => actualizarCuy(
                                                                lote.loteId, c.numeroEnLote,
                                                                { motivo: e.target.value })}
                                                            placeholder={c.estado === "Rechazado"
                                                                ? "¿Por qué no es apto?"
                                                                : "¿Qué novedad presenta?"}
                                                            className="w-full h-11 px-3 rounded-xl border-2
                                         border-gray-200 text-sm focus:border-primary-500
                                         focus:outline-none"
                                                        />
                                                    )}
                                                    {c.estado === "Rechazado" && (
                                                        <label className="flex items-center gap-2
                                               bg-teja-50 rounded-xl px-3 py-2.5
                                               cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={c.retornarAProductora}
                                                                onChange={(e) => actualizarCuy(
                                                                    lote.loteId, c.numeroEnLote, {
                                                                    retornarAProductora: e.target.checked
                                                                })}
                                                                className="w-5 h-5 rounded accent-[#c0392b]"
                                                            />
                                                            <span className="text-sm font-semibold text-teja-700">
                                                                Devolver este cuy a su productora
                                                            </span>
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Paso 4: resumen ── */}
                {paso === 4 && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            {[
                                ["Faenados", faenados, "text-primary-700"],
                                ["No aptos", noAptos.length, "text-teja-600"],
                                ["Retornan", retornados, "text-bayo-700"],
                                ["Prom. canal", pesoPromedio > 0 ? `${pesoPromedio}g` : "—",
                                    pesoPromedio >= 907 ? "text-primary-700"
                                        : pesoPromedio >= 880 ? "text-bayo-700"
                                            : pesoPromedio > 0 ? "text-teja-600" : "text-gray-400"],
                            ].map(([k, v, cls]) => (
                                <div key={k as string}
                                    className="bg-white rounded-2xl border border-gray-200 px-2 py-3">
                                    <p className={`text-xl font-extrabold ${cls}`}>{v}</p>
                                    <p className="text-[10px] font-bold uppercase
                                  tracking-wide text-gray-400">{k}</p>
                                </div>
                            ))}
                        </div>

                        {retornados > 0 && (
                            <div className="bg-teja-50 border border-teja-100 rounded-2xl
                                px-4 py-3 text-sm text-teja-700 font-semibold">
                                {retornados} {retornados === 1 ? "cuy será devuelto" : "cuyes serán devueltos"} a
                                su productora de origen.
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                                Observaciones (opcional)
                            </label>
                            <textarea
                                rows={3}
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                placeholder="Algo que anotar sobre esta jornada…"
                                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200
                           bg-white text-base resize-none focus:border-primary-500
                           focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-teja-50 border border-teja-100 rounded-2xl
                          px-4 py-3 text-sm text-teja-700">
                        {error}
                    </div>
                )}
            </div>
        </ModalShell>
    );
}
