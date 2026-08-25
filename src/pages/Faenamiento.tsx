import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faenamientoApi } from "../api/faenamiento";
import { recepcionApi } from "../api/recepcion";
import { catalogosApi } from "../api/admin";
import { pagosApi } from "../api/pagos";
import { imprimirTicket } from "../api/imprimirTicket";
import { useAuth } from "../context/useAuth";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";
import { Segmentado } from "../components/ui/Segmentado";
import { FormFaenamiento } from "../components/faenamiento/FormFaenamiento";
import { FormDevolucion } from "../components/faenamiento/FormDevolucion";
import { FormPagoProductora } from "../components/faenamiento/FormPagoProductora";
import { PanelQR } from "../components/faenamiento/PanelQR";
import type { EstadoCanal } from "../types/faenamiento";
import type { Movilizacion } from "../types/recepcion";
import type { TicketPorPagar } from "../types/productora";

const canalBadge = (e: EstadoCanal) => {
    if (e === "Apto") return <Badge label="Apto" variant="success" />;
    if (e === "ConNovedad") return <Badge label="Con novedad" variant="warning" />;
    return <Badge label="Rechazado" variant="danger" />;
};

type Tab = "faenamientos" | "llegadas" | "devoluciones" | "pagos";

// Espejo de Features/Recepcion/Models/CondicionLlegada.cs. El servidor es la
// fuente de verdad y rechaza con 400 cualquier clave que no reconozca, así
// que si esto se desincroniza se ve como un error al confirmar, no como un
// dato incorrecto guardado.
const CONDICIONES_LLEGADA: { clave: string; etiqueta: string }[] = [
    { clave: "AnimalesGolpeados", etiqueta: "Animales con golpes o heridas" },
    { clave: "AnimalesDeshidratados", etiqueta: "Animales deshidratados o decaídos" },
    { clave: "AnimalesMuertos", etiqueta: "Animales muertos" },
    { clave: "JaulasSucias", etiqueta: "Jaulas sucias o con excretas" },
    { clave: "Hacinamiento", etiqueta: "Hacinamiento en la jaula" },
    { clave: "JaulasDanadas", etiqueta: "Jaulas rotas o mal aseguradas" },
    { clave: "Otro", etiqueta: "Otra condición (ver observación)" },
];

// Separador de Features/Recepcion/Models/CondicionTransporte.cs — punto y
// coma, no coma: las etiquetas del catálogo llevan comas dentro.
const SEPARADOR_CLAVES = ";";

export default function Faenamiento() {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const [tab, setTab] = useState<Tab>("faenamientos");
    const [showForm, setShowForm] = useState(false);
    const [showFormDevolucion, setShowFormDevolucion] = useState(false);
    const [loteSelecto, setLoteSelecto] = useState<string | null>(null);
    const [confirmando, setConfirmando] = useState<Movilizacion | null>(null);
    const [condicionLlegada, setCondicionLlegada] = useState("");
    // null = sin responder todavía. Es obligatoria solo cuando el checklist
    // de transporte salió incompleto (ver checklistIncompleto más abajo).
    const [llegaronEnBuenEstado, setLlegaronEnBuenEstado] = useState<boolean | null>(null);
    const [condicionesLlegadaMarcadas, setCondicionesLlegadaMarcadas] = useState<string[]>([]);
    const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);
    const [ticketAbierto, setTicketAbierto] = useState<TicketPorPagar | null>(null);

    const { data: faenamientos = [], isLoading } = useQuery({
        queryKey: ["faenamientos"],
        queryFn: () => faenamientoApi.listar(),
    });

    const { data: devoluciones = [], isLoading: cargandoDev } = useQuery({
        queryKey: ["devoluciones"],
        queryFn: () => faenamientoApi.listarDevoluciones(),
        enabled: tab === "devoluciones",
    });

    // Cuyes devueltos vivos a su productora antes del faenamiento
    const { data: retornos = [], isLoading: cargandoRet } = useQuery({
        queryKey: ["retornos"],
        queryFn: () => faenamientoApi.listarRetornos(),
        enabled: tab === "devoluciones",
    });

    const { data: movilizaciones = [], isLoading: cargandoMov } = useQuery({
        queryKey: ["movilizaciones"],
        queryFn: () => recepcionApi.listarMovilizaciones(),
        enabled: tab === "llegadas",
    });

    const { data: ticketsPorPagar = [] } = useQuery({
        queryKey: ["tickets_por_pagar"],
        queryFn: () => pagosApi.porPagar(),
        enabled: tab === "pagos",
    });

    // Catálogo de condiciones de TRANSPORTE (el que llena el CAT al salir).
    // Se carga aquí para comparar contra `condicionesClaves` de la
    // movilización y saber si el checklist salió incompleto. Mismo queryKey
    // que FormMovilizacion: si ya se cargó en esta sesión, no vuelve a pedirlo.
    const { data: condicionesTransporte = [] } = useQuery({
        queryKey: ["condiciones_transporte"],
        queryFn: () => catalogosApi.listarCondicionesTransporte(),
        enabled: !!confirmando,
        staleTime: Infinity,
    });

    // Un lote faenado (FAE-…) puede reunir varias jaulas: la vista muestra
    // UNA fila por lote faenado con sus jaulas de origen agrupadas
    const lotesFaenados = useMemo(() => {
        const grupos = new Map<string, typeof faenamientos>();
        for (const f of faenamientos) {
            const clave = f.codigoLoteFaenado ?? f.codigoLote;
            const lista = grupos.get(clave) ?? [];
            lista.push(f);
            grupos.set(clave, lista);
        }
        return Array.from(grupos.entries()).map(([codigo, sesiones]) => {
            const unidades = sesiones.reduce(
                (acc, s) => acc + s.unidadesFaenadas, 0);
            const pesoTotal = sesiones.reduce(
                (acc, s) => acc + s.pesoTotalCanalGramos, 0);
            const conNovedad = sesiones.some(
                (s) => s.estadoCanal === "ConNovedad");
            const rechazado = sesiones.every(
                (s) => s.estadoCanal === "Rechazado");
            // Cuántos animales de la sesión salieron con novedad. Saber que el
            // lote "tiene novedad" no dice nada útil: 1 de 15 y 14 de 15 se
            // leían igual, y son decisiones distintas.
            const animalesConNovedad = sesiones.reduce(
                (acc, s) => acc + s.cuyes.filter(
                    (c) => c.estado === "ConNovedad").length, 0);
            return {
                codigo,
                animalesConNovedad,
                esFae: !!sesiones[0].codigoLoteFaenado,
                jaulas: sesiones.map((s) => ({
                    codigoLote: s.codigoLote,
                    numeroSesion: s.numeroSesion,
                    comunidad: s.comunidadOrigen,
                })),
                comunidades: [...new Set(
                    sesiones.map((s) => s.comunidadOrigen))].join(" y "),
                unidades,
                pesoPromedio: unidades > 0
                    ? Math.round(pesoTotal / unidades) : 0,
                estado: (rechazado ? "Rechazado"
                    : conNovedad ? "ConNovedad" : "Apto") as EstadoCanal,
            };
        });
    }, [faenamientos]);

    // Claves que el CAT sí verificó al despachar, o null si esta movilización
    // es anterior a la feature (CondicionesClaves nulo o ausente): ahí no se
    // sabe qué se marcó, así que no se le puede exigir nada al operador de
    // planta. `!=` (doble igual) a propósito, no `!==`: cubre tanto null
    // como undefined si el API responde sin el campo. No usar `!== undefined
    // && !== null` tampoco: sería lo mismo pero más largo para el mismo
    // resultado.
    const clavesVerificadas = confirmando && confirmando.condicionesClaves != null
        ? confirmando.condicionesClaves.split(SEPARADOR_CLAVES)
            .map((c) => c.trim()).filter((c) => c.length > 0)
        : null;

    const condicionesNoVerificadas = clavesVerificadas === null
        ? []
        : condicionesTransporte.filter((c) => !clavesVerificadas.includes(c.clave));

    // Obligatoria solo si hubo checklist (no nulo) y quedó incompleto.
    const checklistIncompleto = clavesVerificadas !== null
        && condicionesNoVerificadas.length > 0;

    const puedeConfirmar =
        // El catálogo de transporte todavía no cargó (o la consulta falló:
        // en react-query v5 isLoading es false en ese caso) y hace falta
        // para saber si la pregunta es obligatoria. Con el catálogo vacío
        // no se puede saber si el checklist estaba completo, así que mejor
        // no dejar confirmar como si lo estuviera.
        !(clavesVerificadas !== null && condicionesTransporte.length === 0)
        && !(checklistIncompleto && llegaronEnBuenEstado === null)
        && !(llegaronEnBuenEstado === false && condicionesLlegadaMarcadas.length === 0);

    const alternarCondicionLlegada = (clave: string) =>
        setCondicionesLlegadaMarcadas((prev) =>
            prev.includes(clave)
                ? prev.filter((c) => c !== clave)
                : [...prev, clave]);

    // Cierra el modal y limpia los tres estados nuevos además de la
    // observación: si no, el siguiente lote hereda lo que se respondió del
    // anterior y el operador confirmaría una llegada con datos de otra.
    const cerrarModalConfirmacion = () => {
        setConfirmando(null);
        setCondicionLlegada("");
        setLlegaronEnBuenEstado(null);
        setCondicionesLlegadaMarcadas([]);
        setErrorConfirmacion(null);
    };

    const confirmarLlegada = useMutation({
        mutationFn: (m: Movilizacion) =>
            recepcionApi.confirmarRecepcionPlanta(m.id, {
                recibidoPor: auth.nombreCompleto ?? "Operador de planta",
                condicionLlegada: condicionLlegada || undefined,
                llegaronEnBuenEstado: llegaronEnBuenEstado ?? undefined,
                condicionesLlegada: llegaronEnBuenEstado === false
                    ? condicionesLlegadaMarcadas
                    : undefined,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["movilizaciones"] });
            cerrarModalConfirmacion();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setErrorConfirmacion(err.response?.data?.mensaje
                ?? "No se pudo confirmar la llegada.");
        },
    });

    // Igual que en Recepción: `imprimirTicket` rechaza cuando el navegador
    // bloquea la ventana emergente, y sin este catch esa promesa quedaba
    // rechazada sin manejar mientras el botón no hacía nada visible.
    const handleImprimirTicket = async (pagoId: number) => {
        try {
            await imprimirTicket(pagoId);
        } catch {
            window.alert("No se pudo imprimir el ticket. Intenta de nuevo.");
        }
    };

    return (
        <MainLayout>
            <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        Faenamiento
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Planta Sulupali Chico — Santa Isabel
                    </p>
                </div>
                {tab !== "llegadas" && tab !== "pagos" && (
                    <button
                        onClick={() => tab === "faenamientos"
                            ? setShowForm(true)
                            : setShowFormDevolucion(true)}
                        className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-semibold rounded-xl transition
                     active:scale-[0.98]"
                    >
                        {tab === "faenamientos"
                            ? "+ Registrar faenamiento"
                            : "+ Registrar devolución"}
                    </button>
                )}
            </div>

            <div className="mb-5">
                <Segmentado
                    activo={tab}
                    onCambio={setTab}
                    opciones={[
                        { id: "faenamientos", label: "Faenamientos" },
                        { id: "llegadas", label: "Llegadas de CAT" },
                        { id: "devoluciones", label: "Devoluciones" },
                        { id: "pagos", label: "Pagos" },
                    ]}
                />
            </div>

            {/* ── Tab faenamientos ── */}
            {tab === "faenamientos" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">

                    {/* Lista de faenamientos */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-sm text-gray-400">
                                    Cargando faenamientos...
                                </div>
                            ) : faenamientos.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-400">
                                    No hay faenamientos registrados aún.
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            {["Lote faenado", "Jaulas de origen", "Comunidades",
                                                "Unidades", "Peso prom.", "Estado", ""].map(h => (
                                                    <th key={h}
                                                        className="px-4 py-3 text-left text-xs font-bold
                                   text-gray-500 uppercase tracking-wide">
                                                        {h}
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {lotesFaenados.map((lf) => (
                                            <tr
                                                key={lf.codigo}
                                                onClick={() => setLoteSelecto(lf.codigo)}
                                                className={`hover:bg-gray-50 transition cursor-pointer
                                  ${loteSelecto === lf.codigo
                                                        ? "bg-primary-50"
                                                        : ""}`}
                                            >
                                                <td className="px-4 py-3 font-mono text-xs font-bold
                                       text-primary-800">
                                                    {lf.esFae ? lf.codigo : "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {lf.jaulas.map((j) => (
                                                        <span key={j.codigoLote}
                                                            className="block font-mono text-xs
                                             text-gray-700">
                                                            {j.codigoLote}
                                                            <span className="ml-1 text-[10px] font-bold
                                               text-primary-700">
                                                                F{j.numeroSesion}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {lf.comunidades}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 text-center">
                                                    {lf.unidades}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {lf.pesoPromedio}g
                                                </td>
                                                <td className="px-4 py-3">
                                                    {canalBadge(lf.estado)}
                                                    {lf.animalesConNovedad > 0 && (
                                                        <span className="block mt-1 text-xs text-gray-500">
                                                            {lf.animalesConNovedad} de {lf.unidades} con novedad
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs text-primary-600">
                                                        {loteSelecto === lf.codigo
                                                            ? "QR seleccionado" : "Ver QR"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Panel QR lateral */}
                    <div className="lg:col-span-1">
                        {loteSelecto ? (
                            <div className="space-y-3">
                                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                                    <p className="text-xs text-gray-400 mb-1">
                                        Lote faenado seleccionado
                                    </p>
                                    <p className="font-mono text-sm font-medium text-gray-800">
                                        {loteSelecto}
                                    </p>
                                </div>
                                <PanelQR codigoLote={loteSelecto} />
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200
                              p-6 text-center text-sm text-gray-400">
                                Selecciona un faenamiento de la lista para ver o generar su QR.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab llegadas: movilizaciones desde los CAT ── */}
            {tab === "llegadas" && (
                <div className="space-y-3 animate-fade-in-up">
                    {cargandoMov ? (
                        <div className="bg-white rounded-2xl border border-gray-200
                            p-8 text-center text-sm text-gray-400">
                            Cargando movilizaciones…
                        </div>
                    ) : movilizaciones.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200
                            p-8 text-center text-sm text-gray-400">
                            Ningún CAT ha registrado envíos todavía.
                        </div>
                    ) : (
                        movilizaciones.map((m) => {
                            const pendiente = m.fechaRecepcionPlanta === null;
                            return (
                                <div key={m.id}
                                    className="bg-white rounded-2xl border border-gray-200 p-4">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div>
                                            <p className="font-mono text-sm font-bold text-gray-800">
                                                {m.codigoLote}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-0.5">
                                                {m.nombreProductora} · {m.cantidadMovilizada} cuyes
                                                · conduce {m.conductor}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Salió del CAT: {new Date(m.fechaDespacho)
                                                    .toLocaleString("es-EC")}
                                                {m.tipoForraje && ` · Forraje: ${m.tipoForraje}`}
                                                {m.sinAntibioticos7Dias === true
                                                    ? " · Sin antibióticos últimos 7 días"
                                                    : m.diasRetiroMedicamentos !== null
                                                        ? ` · Retiro medicamentos: ${m.diasRetiroMedicamentos} días`
                                                        : ""}
                                            </p>
                                            {!pendiente && (
                                                <p className="text-xs text-primary-700 mt-1">
                                                    Recibido el {new Date(m.fechaRecepcionPlanta!)
                                                        .toLocaleString("es-EC")} por {m.recibidoPor}
                                                    {m.condicionLlegada && ` — ${m.condicionLlegada}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="shrink-0">
                                            {pendiente ? (
                                                <button
                                                    onClick={() => setConfirmando(m)}
                                                    className="h-10 px-4 bg-bayo-500 hover:bg-bayo-600
                                     text-white text-xs font-bold rounded-xl
                                     transition active:scale-[0.97]"
                                                >
                                                    Confirmar llegada
                                                </button>
                                            ) : (
                                                <Badge label="Recibido" variant="success" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── Tab devoluciones — RF-307 ── */}
            {tab === "devoluciones" && (
                <div className="space-y-6 animate-fade-in-up">

                    {/* Cuyes devueltos VIVOS a su productora antes de faenar */}
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wide
                           text-gray-500 mb-2">
                            Cuyes vivos devueltos a productora
                        </h2>
                        <div className="bg-white rounded-2xl border border-gray-200
                            overflow-x-auto">
                            {cargandoRet ? (
                                <div className="p-8 text-center text-sm text-gray-400">
                                    Cargando retornos…
                                </div>
                            ) : retornos.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-400">
                                    Ningún animal ha sido devuelto vivo a su productora.
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            {["Jaula", "Cuy", "Productora", "Motivo",
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
                                        {retornos.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 font-mono text-xs
                                       text-gray-700">
                                                    {r.codigoLote}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold
                                       text-gray-700">
                                                    #{r.numeroEnLote}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {r.nombreProductora}
                                                    <span className="block text-xs text-gray-400">
                                                        {r.comunidad}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {r.motivo}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {new Date(r.fechaRetorno)
                                                        .toLocaleDateString("es-EC")}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {r.responsable}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge label="Vivo" variant="warning" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Devoluciones de producto por clientes (post-despacho) */}
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wide
                           text-gray-500 mb-2">
                            Devoluciones de clientes
                        </h2>
                        <div className="bg-white rounded-2xl border border-gray-200
                            overflow-x-auto">
                    {cargandoDev ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando devoluciones…
                        </div>
                    ) : devoluciones.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No hay devoluciones registradas. ¡Buena señal!
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Código lote", "Sesión", "Productora", "Cliente",
                                        "Unidades", "Motivo", "Fecha"].map(h => (
                                            <th key={h}
                                                className="px-4 py-3 text-left text-xs font-bold
                                 text-gray-500 uppercase tracking-wide">
                                                {h}
                                            </th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {devoluciones.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                                            {d.codigoLoteFaenado ?? d.codigoLote ?? "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.numeroSesion ? (
                                                <span className="inline-flex px-2 py-0.5 rounded-full
                                     bg-primary-50 text-primary-800
                                     text-xs font-bold">
                                                    F{d.numeroSesion}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {d.nombreProductora}
                                            <span className="block text-xs text-gray-400">
                                                {d.comunidad}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {d.clienteDevuelve}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-600">
                                            {d.cantidadUnidades}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{d.motivo}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(d.fechaDevolucion).toLocaleDateString("es-EC")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab pagos: tickets emitidos por los CAT ── */}
            {tab === "pagos" && (
                <div className="space-y-3">
                    {ticketsPorPagar.length === 0 && (
                        <p className="text-sm text-gray-400">
                            No hay tickets pendientes de pago.
                        </p>
                    )}

                    {ticketsPorPagar.map((t) => (
                        <div key={t.pagoId}
                            className="bg-white rounded-2xl border-2 border-gray-100
                                p-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="font-bold text-gray-900">
                                    {t.nombreProductora}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {t.codigoLote} · {t.centroAcopio} ·
                                    {" "}{t.cuyesEntregados} cuyes
                                </p>
                                <p className="text-lg font-extrabold text-gray-900">
                                    ${t.montoUsd.toFixed(2)}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleImprimirTicket(t.pagoId)}
                                    className="min-h-[44px] px-3 rounded-xl border-2
                                        border-gray-200 bg-white text-xs font-bold
                                        text-gray-700 hover:bg-gray-50 transition"
                                >
                                    🧾 Ver ticket
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTicketAbierto(t)}
                                    className="min-h-[44px] px-3 rounded-xl
                                        bg-primary-600 hover:bg-primary-700
                                        text-white text-xs font-bold transition"
                                >
                                    Registrar pago
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {ticketAbierto && (
                <FormPagoProductora
                    ticket={ticketAbierto}
                    onClose={() => setTicketAbierto(null)}
                />
            )}

            {showForm && <FormFaenamiento onClose={() => setShowForm(false)} />}
            {showFormDevolucion && (
                <FormDevolucion onClose={() => setShowFormDevolucion(false)} />
            )}

            {/* Confirmación de llegada a planta */}
            {confirmando && (
                <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md
                        max-h-[90vh] overflow-y-auto p-6">
                        <h3 className="text-lg font-extrabold tracking-tight text-gray-900">
                            Confirmar llegada
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                            Lote <span className="font-mono font-semibold">
                                {confirmando.codigoLote}</span> — se registrará la fecha
                            actual y tu nombre como receptor.
                        </p>

                        {/* Arriba del todo, antes del checklist: el modal tiene
                            scroll y un error pintado al fondo puede quedar
                            fuera de la vista justo cuando el operador más lo
                            necesita ver. */}
                        {errorConfirmacion && (
                            <div className="rounded-xl border-2 border-teja-200 bg-teja-50
                                p-3 mb-4">
                                <p className="text-sm font-semibold text-teja-800">
                                    {errorConfirmacion}
                                </p>
                            </div>
                        )}

                        {checklistIncompleto && (
                            <div className="rounded-xl border-2 border-teja-200 bg-teja-50
                                p-3 mb-4">
                                <p className="text-sm font-semibold text-teja-800">
                                    <span aria-hidden="true">⚠️</span> El checklist de
                                    transporte quedó incompleto. No se verificó:{" "}
                                    {condicionesNoVerificadas.map((c) => c.etiqueta).join(", ")}.
                                </p>
                            </div>
                        )}

                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            ¿Los animales llegaron en buen estado?{" "}
                            {checklistIncompleto ? "(obligatorio)" : "(opcional)"}
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => setLlegaronEnBuenEstado(true)}
                                className={`min-h-[44px] px-3 rounded-xl border-2 text-sm
                                    font-semibold transition
                                    ${llegaronEnBuenEstado === true
                                        ? "border-primary-500 bg-primary-50 text-primary-800"
                                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                            >
                                Sí, en buen estado
                            </button>
                            <button
                                type="button"
                                onClick={() => setLlegaronEnBuenEstado(false)}
                                className={`min-h-[44px] px-3 rounded-xl border-2 text-sm
                                    font-semibold transition
                                    ${llegaronEnBuenEstado === false
                                        ? "border-teja-500 bg-teja-50 text-teja-800"
                                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                            >
                                No, hay algo que reportar
                            </button>
                        </div>

                        {llegaronEnBuenEstado === false && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wide
                                    text-gray-500 mb-1">
                                    ¿Qué se encontró al abrir la jaula?
                                </label>
                                <div className="space-y-1">
                                    {CONDICIONES_LLEGADA.map((c) => {
                                        const marcada = condicionesLlegadaMarcadas
                                            .includes(c.clave);
                                        return (
                                            <label
                                                key={c.clave}
                                                className={`flex items-center gap-3 min-h-[44px]
                                                    px-3 rounded-xl border-2 cursor-pointer
                                                    transition
                                                    ${marcada
                                                        ? "border-primary-500 bg-primary-50"
                                                        : "border-gray-200 bg-white hover:bg-gray-50"}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={marcada}
                                                    onChange={() =>
                                                        alternarCondicionLlegada(c.clave)}
                                                    className="w-5 h-5 accent-primary-600 shrink-0"
                                                />
                                                <span className={`text-sm ${marcada
                                                    ? "font-semibold text-primary-800"
                                                    : "text-gray-700"}`}>
                                                    {c.etiqueta}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {condicionesLlegadaMarcadas.length === 0 && (
                                    <p className="mt-1.5 text-xs text-teja-700">
                                        Marca al menos una condición para poder confirmar.
                                    </p>
                                )}
                            </div>
                        )}

                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            ¿Cómo llegaron los animales? (opcional)
                        </label>
                        <input
                            type="text"
                            value={condicionLlegada}
                            onChange={(e) => setCondicionLlegada(e.target.value)}
                            placeholder="Por ejemplo: todos en buen estado"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={cerrarModalConfirmacion}
                                className="flex-1 h-11 border-2 border-gray-200 rounded-xl
                           text-sm font-semibold text-gray-700 hover:bg-gray-50
                           transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setErrorConfirmacion(null);
                                    confirmarLlegada.mutate(confirmando);
                                }}
                                disabled={confirmarLlegada.isPending || !puedeConfirmar}
                                className="flex-1 h-11 bg-primary-600 hover:bg-primary-700
                           disabled:bg-primary-300 text-white rounded-xl
                           text-sm font-bold transition"
                            >
                                {confirmarLlegada.isPending
                                    ? "Confirmando…" : "Confirmar llegada"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
