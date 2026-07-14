import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productorasApi } from "../../api/productoras";
import { recepcionApi } from "../../api/recepcion";
import { offlineDB } from "../../services/db";
import { useAuth } from "../../context/AuthContext";
import type {
    RegistrarEntregaRequest, ColorPelaje, CuyRegistro,
    EstadoOreja, TamanoAnimal, EntregaOffline
} from "../../types/recepcion";
import type { CentroAcopio } from "../../types/productora";
import { CENTROS_ACOPIO } from "../../types/productora";

interface Props {
    isOnline: boolean;
    onGuardado: () => void;
    onClose: () => void;
}

// Opciones como tarjetas grandes con pictograma: pensadas para
// operadoras con poca experiencia digital, en tablet de 7"
const COLORES: { valor: ColorPelaje; icono: string; nota?: string }[] = [
    { valor: "Blanco", icono: "⚪" },
    { valor: "Bayo", icono: "🟡" },
    { valor: "Plomo", icono: "⚫" },
    { valor: "Combinado", icono: "🟤" },
    { valor: "Negro", icono: "⬛", nota: "Va a venta local" },
];

const OREJAS: { valor: EstadoOreja; titulo: string; nota: string }[] = [
    { valor: "Blanda", titulo: "Blanda", nota: "Tierno (3–4 meses)" },
    { valor: "Semiblanda", titulo: "Semiblanda", nota: "Revisar" },
    { valor: "Dura", titulo: "Dura", nota: "Viejo — se anota" },
];

const TAMANOS: { valor: TamanoAnimal; titulo: string }[] = [
    { valor: "Pequeno", titulo: "Pequeño" },
    { valor: "Normal", titulo: "Normal" },
    { valor: "Grande", titulo: "Grande" },
];

const TOTAL_PASOS = 5;

const TITULOS: Record<number, { titulo: string; ayuda: string }> = {
    1: { titulo: "¿De quién son los cuyes?", ayuda: "Busca y toca el nombre de la productora" },
    2: { titulo: "¿Cuántos cuyes entrega?", ayuda: "Cuenta los animales de esta entrega" },
    3: { titulo: "Revisa cada cuy", ayuda: "Pesa y observa uno por uno" },
    4: { titulo: "Últimos datos", ayuda: "Confirma el ayuno y quién recibe" },
    5: { titulo: "Revisa y guarda", ayuda: "Verifica que todo esté bien antes de guardar" },
};

// Tope de una entrega individual: dos jaulas completas
const MAX_ENTREGA = 40;

const CUY_INICIAL: CuyRegistro = {
    pesoGramos: 0,
    colorPelaje: "Blanco",
    estadoOreja: "Blanda",
    tamanoAnimal: "Normal",
    signosClinicos: "",
};

type NivelCuy = "ok" | "sobrepeso" | "novedad" | "rechazo";

// Evaluación local por animal: espejo de las reglas del backend
// (SRS Apéndice 5.1 + rango operativo 875–1300 g).
//
// "sobrepeso" es su propio nivel y no una novedad más: el animal está sano y
// se acepta, solo queda fuera del rango comercial. Mezclarlo con el bajo peso
// bajo el mismo ámbar hacía que la operadora leyera "problema" en los dos.
// Un nivel posterior solo sube (ok → sobrepeso → novedad → rechazo).
const ORDEN: NivelCuy[] = ["ok", "sobrepeso", "novedad", "rechazo"];
const subir = (actual: NivelCuy, nuevo: NivelCuy): NivelCuy =>
    ORDEN.indexOf(nuevo) > ORDEN.indexOf(actual) ? nuevo : actual;

function evaluarCuy(c: CuyRegistro): {
    nivel: NivelCuy | null;
    motivos: string[];
} {
    if (c.pesoGramos <= 0) return { nivel: null, motivos: [] };

    const motivos: string[] = [];
    let nivel: NivelCuy = "ok";

    if (c.pesoGramos < 850) {
        nivel = subir(nivel, "rechazo");
        motivos.push("peso bajo el mínimo (850 g)");
    } else if (c.pesoGramos < 875) {
        nivel = subir(nivel, "novedad");
        motivos.push("peso justo (850–874 g)");
    } else if (c.pesoGramos > 1300) {
        nivel = subir(nivel, "sobrepeso");
        motivos.push("peso sobre 1300 g");
    }

    if (c.colorPelaje === "Negro") {
        nivel = subir(nivel, "novedad");
        motivos.push("piel negra");
    }
    if (c.estadoOreja === "Dura") {
        nivel = subir(nivel, "novedad");
        motivos.push("oreja dura");
    }
    if (c.signosClinicos?.trim()) {
        nivel = subir(nivel, "novedad");
        motivos.push("signos clínicos");
    }

    return { nivel, motivos };
}

function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function FormLote({ isOnline, onGuardado, onClose }: Props) {
    const { auth } = useAuth();

    const [paso, setPaso] = useState(1);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Datos generales del lote. Un Operador de CAT queda fijado a su centro.
    const catFijo = auth.rol === "OperadorCAT"
        ? (auth.catAsignado as CentroAcopio | null) : null;
    const [productoraId, setProductoraId] = useState(0);
    const [centroAcopio, setCentroAcopio] = useState<CentroAcopio>(
        catFijo ?? "PAT");
    const [cantidad, setCantidad] = useState(1);
    const [enAyunas, setEnAyunas] = useState(true);
    const [responsable, setResponsable] = useState(auth.nombreCompleto ?? "");
    const [observaciones, setObservaciones] = useState("");

    // Registro individual: un formulario por cuy
    const [cuyes, setCuyes] = useState<CuyRegistro[]>([{ ...CUY_INICIAL }]);
    const [cuyActual, setCuyActual] = useState(0);
    const [conObservacionSanitaria, setConObservacionSanitaria] = useState(false);

    const { data: productoras = [] } = useQuery({
        queryKey: ["productoras"],
        queryFn: () => productorasApi.listar(),
    });

    const productorasFiltradas = useMemo(() => {
        const q = busqueda.toLowerCase();
        return productoras.filter((p) =>
            p.nombreCompleto.toLowerCase().includes(q) ||
            p.comunidad.toLowerCase().includes(q));
    }, [productoras, busqueda]);

    const productoraElegida = productoras.find((p) => p.id === productoraId);

    // Ajusta el arreglo de cuyes al cambiar la cantidad: conserva los ya
    // registrados y precarga los nuevos con los valores del último
    const ajustarCantidad = (n: number) => {
        setCantidad(n);
        setCuyes((prev) => {
            if (n <= prev.length) return prev.slice(0, n);
            const base = prev[prev.length - 1] ?? CUY_INICIAL;
            return [
                ...prev,
                ...Array.from({ length: n - prev.length }, () => ({
                    ...base, pesoGramos: 0, signosClinicos: "",
                })),
            ];
        });
    };

    const actualizarCuy = (cambios: Partial<CuyRegistro>) => {
        setCuyes((prev) => prev.map((c, i) =>
            i === cuyActual ? { ...c, ...cambios } : c));
    };

    const cuy = cuyes[cuyActual];
    const evalCuy = evaluarCuy(cuy);

    // Resumen del lote a partir de los animales
    const evaluaciones = cuyes.map(evaluarCuy);
    const conNovedad = evaluaciones.filter((e) => e.nivel === "novedad").length;
    const rechazados = evaluaciones.filter((e) => e.nivel === "rechazo").length;
    const conSobrepeso = evaluaciones.filter((e) => e.nivel === "sobrepeso").length;
    const pesoTotal = cuyes.reduce((acc, c) => acc + (c.pesoGramos || 0), 0);
    const pesoPromedio = cuyes.length > 0 ? Math.round(pesoTotal / cuyes.length) : 0;

    const puedeAvanzar = () => {
        if (paso === 1) return productoraId !== 0;
        if (paso === 2) return cantidad >= 1;
        if (paso === 3) return cuyes.every((c) => c.pesoGramos > 0);
        if (paso === 4) return responsable.trim().length > 0;
        return true;
    };

    const elegirProductora = (id: number, cat: string) => {
        setProductoraId(id);
        // Con CAT fijo del operador no se cambia el centro
        if (!catFijo && CENTROS_ACOPIO.some((c) => c.value === cat))
            setCentroAcopio(cat as CentroAcopio);
    };

    const construirRequest = (): RegistrarEntregaRequest => ({
        centroAcopio,
        productoraId,
        enAyunas,
        responsableRecepcion: responsable,
        observaciones,
        cuyes: cuyes.map((c) => ({
            ...c,
            signosClinicos: c.signosClinicos?.trim() || undefined,
        })),
    });

    const handleGuardar = async () => {
        setError(null);
        setLoading(true);
        try {
            const request = construirRequest();
            if (isOnline) {
                // En línea el servidor sella la fecha: no se envía ninguna
                await recepcionApi.registrarEntrega(request);
            } else {
                const entregaOffline: EntregaOffline = {
                    ...request,
                    // Sin señal no hay reloj del servidor: se sella aquí el
                    // momento real de la recepción. Si esperáramos al sync,
                    // la entrega quedaría fechada el día que hubo cobertura.
                    fechaCapturaOffline: new Date().toISOString(),
                    sincronizadoOffline: true,
                    dispositivoId: localStorage.getItem("dispositivo_id")
                        ?? `tab-${Date.now()}`,
                    _tipo: "entrega",
                    _id: uuid(),
                    _estado: "pendiente",
                    _fechaCreacion: new Date().toISOString(),
                    _intentos: 0,
                };
                await offlineDB.guardar(entregaOffline);
            }
            onGuardado();
            onClose();
        } catch (e: unknown) {
            // Mostrar el motivo real que devuelve el backend
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo guardar la entrega. Revisa la conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    // Tarjeta táctil grande (mínimo 44px de alto — RNF-201)
    const tarjeta = (
        activa: boolean,
        onClick: () => void,
        contenido: React.ReactNode,
        key: string
    ) => (
        <button
            key={key}
            type="button"
            onClick={onClick}
            className={`min-h-[56px] rounded-2xl border-2 px-3 py-2.5 text-left
                transition-all active:scale-[0.97]
                ${activa
                    ? "border-primary-600 bg-primary-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-primary-300"}`}
        >
            {contenido}
        </button>
    );

    const { titulo, ayuda } = TITULOS[paso];

    const semaforoCuy = evalCuy.nivel === null ? null : {
        ok: { color: "bg-primary-600", texto: "Cuy correcto" },
        // Azul: se acepta igual, solo avisa que sale del rango comercial
        sobrepeso: {
            color: "bg-info-500",
            texto: `Se acepta, fuera de rango: ${evalCuy.motivos.join(", ")}`,
        },
        novedad: { color: "bg-bayo-500", texto: `Con observación: ${evalCuy.motivos.join(", ")}` },
        rechazo: { color: "bg-teja-500", texto: `Será RECHAZADO: ${evalCuy.motivos.join(", ")}` },
    }[evalCuy.nivel];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center
                justify-center z-50 p-3 overflow-y-auto animate-fade-in">
            <div className="bg-crema rounded-3xl shadow-2xl w-full max-w-xl my-4
                    flex flex-col max-h-[94vh]">

                {/* Encabezado con progreso */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-white
                        rounded-t-3xl">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold uppercase tracking-widest
                          text-primary-700">
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

                    {!isOnline && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs
                          font-medium text-bayo-700 bg-bayo-50 rounded-full
                          px-3 py-1">
                            <span className="w-2 h-2 rounded-full bg-bayo-500" />
                            Sin señal — se guardará en la tablet
                        </p>
                    )}
                </div>

                {/* Contenido del paso */}
                <div className="flex-1 overflow-y-auto px-6 py-5" key={`${paso}-${cuyActual}`}>
                    <div className="animate-slide-in space-y-4">

                        {/* ── Paso 1: productora ── */}
                        {paso === 1 && (
                            <>
                                <input
                                    type="search"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Escribe un nombre o comunidad…"
                                    className="w-full h-12 px-4 rounded-2xl border-2
                             border-gray-200 bg-white text-base
                             focus:border-primary-500 focus:outline-none"
                                />
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {productorasFiltradas.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-6">
                                            No se encontró ninguna productora con ese nombre.
                                        </p>
                                    )}
                                    {productorasFiltradas.map((p) =>
                                        tarjeta(
                                            productoraId === p.id,
                                            () => elegirProductora(p.id, p.catAsignado),
                                            <div className="flex items-center justify-between w-full">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {p.nombreCompleto}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {p.comunidad} · {p.catAsignado}
                                                    </p>
                                                </div>
                                                {productoraId === p.id && (
                                                    <span className="text-primary-600 text-xl">✓</span>
                                                )}
                                            </div>,
                                            `prod-${p.id}`
                                        ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold uppercase
                                      tracking-wide text-gray-500 mb-1">
                                            Centro de acopio
                                        </label>
                                        <select
                                            value={centroAcopio}
                                            disabled={!!catFijo}
                                            onChange={(e) =>
                                                setCentroAcopio(e.target.value as CentroAcopio)}
                                            className="w-full h-12 px-3 rounded-2xl border-2
                                 border-gray-200 bg-white text-base
                                 focus:border-primary-500 focus:outline-none
                                 disabled:bg-gray-50 disabled:text-gray-500"
                                        >
                                            {CENTROS_ACOPIO.map(({ value, label }) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase
                                      tracking-wide text-gray-500 mb-1">
                                            Fecha y hora
                                        </label>
                                        {/* Se sella sola al guardar. No se muestra
                                            la hora actual porque quedaría vieja si
                                            la operadora tarda en llenar la entrega. */}
                                        <div className="w-full h-12 px-3 rounded-2xl border-2
                                 border-gray-100 bg-gray-50 text-sm text-gray-500
                                 flex items-center">
                                            Se registra automáticamente
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Paso 2: cantidad ── */}
                        {paso === 2 && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold uppercase
                                    tracking-wide text-gray-500 mb-2">
                                        ¿Cuántos cuyes entrega la productora?
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button type="button"
                                            aria-label="Quitar uno"
                                            onClick={() => ajustarCantidad(Math.max(1, cantidad - 1))}
                                            className="w-14 h-14 rounded-2xl bg-white border-2
                                 border-gray-200 text-2xl font-bold text-gray-600
                                 active:scale-95 transition">−</button>
                                        <div className="flex-1 h-14 rounded-2xl bg-white border-2
                                    border-primary-200 flex items-center
                                    justify-center">
                                            <span className="text-3xl font-extrabold text-gray-900">
                                                {cantidad}
                                            </span>
                                        </div>
                                        <button type="button"
                                            aria-label="Agregar uno"
                                            onClick={() => ajustarCantidad(
                                                Math.min(MAX_ENTREGA, cantidad + 1))}
                                            className="w-14 h-14 rounded-2xl bg-primary-600 text-white
                                 text-2xl font-bold active:scale-95 transition
                                 hover:bg-primary-700">+</button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 bg-white rounded-2xl
                              border border-gray-200 px-4 py-3">
                                    Los cuyes se suman a la <strong>jaula en armado</strong> del
                                    centro de acopio (máximo 20 por jaula). Si la jaula se llena,
                                    el resto pasa solo a una jaula nueva. En el siguiente paso
                                    vas a pesar y revisar <strong>cada cuy por separado</strong>.
                                </p>
                            </>
                        )}

                        {/* ── Paso 3: registro individual por cuy ── */}
                        {paso === 3 && (
                            <>
                                {/* Navegación entre cuyes */}
                                <div className="flex items-center justify-between">
                                    <p className="text-lg font-extrabold text-gray-900">
                                        Cuy {cuyActual + 1} de {cuyes.length}
                                    </p>
                                    <div className="flex gap-1">
                                        {cuyes.map((c, i) => {
                                            const ev = evaluarCuy(c);
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setCuyActual(i)}
                                                    aria-label={`Ir al cuy ${i + 1}`}
                                                    className={`w-6 h-6 rounded-full text-[10px] font-bold
                                      transition
                                      ${i === cuyActual
                                                            ? "ring-2 ring-primary-600 ring-offset-1"
                                                            : ""}
                                      ${ev.nivel === "rechazo" ? "bg-teja-500 text-white"
                                                            : ev.nivel === "novedad" ? "bg-bayo-500 text-white"
                                                            : ev.nivel === "sobrepeso" ? "bg-info-500 text-white"
                                                                : ev.nivel === "ok" ? "bg-primary-500 text-white"
                                                                    : "bg-gray-200 text-gray-500"}`}
                                                >
                                                    {i + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase
                                    tracking-wide text-gray-500 mb-2">
                                        Peso de este cuy (en gramos)
                                    </label>
                                    <input
                                        type="number" min={0} step={10} inputMode="numeric"
                                        value={cuy.pesoGramos || ""}
                                        onChange={(e) => actualizarCuy({
                                            pesoGramos: Number(e.target.value)
                                        })}
                                        placeholder="Por ejemplo: 950"
                                        className="w-full h-14 px-4 rounded-2xl border-2
                               border-gray-200 bg-white text-2xl font-bold
                               text-center focus:border-primary-500
                               focus:outline-none"
                                        autoFocus
                                    />
                                </div>

                                {/* Semáforo individual */}
                                {semaforoCuy && (
                                    <div className={`${semaforoCuy.color} rounded-2xl px-4 py-3
                                     text-white animate-fade-in-up`}>
                                        <p className="font-semibold text-sm">{semaforoCuy.texto}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide
                                  text-gray-500 mb-2">Color del pelaje</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {COLORES.map((c) =>
                                            tarjeta(
                                                cuy.colorPelaje === c.valor,
                                                () => actualizarCuy({ colorPelaje: c.valor }),
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{c.icono}</span>
                                                    <div>
                                                        <p className="font-semibold text-sm text-gray-900">
                                                            {c.valor}
                                                        </p>
                                                        {c.nota && (
                                                            <p className="text-[10px] text-teja-600">{c.nota}</p>
                                                        )}
                                                    </div>
                                                </div>,
                                                `color-${c.valor}`
                                            ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide
                                      text-gray-500 mb-2">Oreja</p>
                                        <div className="space-y-2">
                                            {OREJAS.map((o) =>
                                                tarjeta(
                                                    cuy.estadoOreja === o.valor,
                                                    () => actualizarCuy({ estadoOreja: o.valor }),
                                                    <div>
                                                        <p className="font-semibold text-sm text-gray-900">
                                                            {o.titulo}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">{o.nota}</p>
                                                    </div>,
                                                    `oreja-${o.valor}`
                                                ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide
                                      text-gray-500 mb-2">Tamaño</p>
                                        <div className="space-y-2">
                                            {TAMANOS.map((t) =>
                                                tarjeta(
                                                    cuy.tamanoAnimal === t.valor,
                                                    () => actualizarCuy({ tamanoAnimal: t.valor }),
                                                    <p className="font-semibold text-sm text-gray-900
                                        text-center w-full">
                                                        {t.titulo}
                                                    </p>,
                                                    `tam-${t.valor}`
                                                ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide
                                  text-gray-500 mb-2">¿Este cuy se ve sano?</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {tarjeta(!cuy.signosClinicos && !conObservacionSanitaria,
                                            () => {
                                                setConObservacionSanitaria(false);
                                                actualizarCuy({ signosClinicos: "" });
                                            },
                                            <div className="text-center w-full">
                                                <p className="text-xl">💚</p>
                                                <p className="font-semibold text-sm text-gray-900">
                                                    Sí, sano
                                                </p>
                                            </div>, "sano-si")}
                                        {tarjeta(!!cuy.signosClinicos || conObservacionSanitaria,
                                            () => setConObservacionSanitaria(true),
                                            <div className="text-center w-full">
                                                <p className="text-xl">🩺</p>
                                                <p className="font-semibold text-sm text-gray-900">
                                                    Veo algo raro
                                                </p>
                                            </div>, "sano-no")}
                                    </div>
                                    {(!!cuy.signosClinicos || conObservacionSanitaria) && (
                                        <textarea
                                            rows={2}
                                            value={cuy.signosClinicos ?? ""}
                                            onChange={(e) => actualizarCuy({
                                                signosClinicos: e.target.value
                                            })}
                                            placeholder="¿Qué observas? Por ejemplo: mancha en la piel, decaído"
                                            className="mt-2 w-full px-4 py-3 rounded-2xl border-2
                                 border-bayo-400 bg-bayo-50 text-base resize-none
                                 focus:border-bayo-500 focus:outline-none
                                 animate-fade-in"
                                        />
                                    )}
                                </div>

                                {/* Navegación entre cuyes */}
                                {cuyes.length > 1 && (
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            type="button"
                                            disabled={cuyActual === 0}
                                            onClick={() => {
                                                setConObservacionSanitaria(false);
                                                setCuyActual(cuyActual - 1);
                                            }}
                                            className="flex-1 h-12 rounded-2xl border-2 border-gray-300
                                 text-sm font-semibold text-gray-700
                                 disabled:opacity-40 transition"
                                        >
                                            ← Cuy anterior
                                        </button>
                                        <button
                                            type="button"
                                            disabled={cuyActual === cuyes.length - 1 || cuy.pesoGramos <= 0}
                                            onClick={() => {
                                                setConObservacionSanitaria(false);
                                                setCuyActual(cuyActual + 1);
                                            }}
                                            className="flex-1 h-12 rounded-2xl bg-primary-100
                                 text-sm font-bold text-primary-800
                                 disabled:opacity-40 transition"
                                        >
                                            Cuy siguiente →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── Paso 4: ayuno + responsable ── */}
                        {paso === 4 && (
                            <>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide
                                  text-gray-500 mb-2">
                                        ¿Los cuyes vienen en ayunas (sin comer)?
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {tarjeta(enAyunas,
                                            () => setEnAyunas(true),
                                            <div className="text-center w-full">
                                                <p className="text-2xl">✅</p>
                                                <p className="font-semibold text-gray-900">Sí, en ayunas</p>
                                            </div>, "ayuno-si")}
                                        {tarjeta(!enAyunas,
                                            () => setEnAyunas(false),
                                            <div className="text-center w-full">
                                                <p className="text-2xl">🌽</p>
                                                <p className="font-semibold text-gray-900">No, ya comieron</p>
                                                <p className="text-xs text-bayo-700">Queda anotado</p>
                                            </div>, "ayuno-no")}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase
                                    tracking-wide text-gray-500 mb-1">
                                        ¿Quién recibe el lote?
                                    </label>
                                    <input
                                        type="text" required
                                        value={responsable}
                                        onChange={(e) => setResponsable(e.target.value)}
                                        placeholder="Nombre de quien recibe"
                                        className="w-full h-12 px-4 rounded-2xl border-2
                               border-gray-200 bg-white text-base
                               focus:border-primary-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase
                                    tracking-wide text-gray-500 mb-1">
                                        Algo más que anotar (opcional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        placeholder="Por ejemplo: la entrega llegó tarde"
                                        className="w-full px-4 py-3 rounded-2xl border-2
                               border-gray-200 bg-white text-base resize-none
                               focus:border-primary-500 focus:outline-none"
                                    />
                                </div>
                            </>
                        )}

                        {/* ── Paso 5: resumen con alerta de novedades ── */}
                        {paso === 5 && (
                            <div className="space-y-3">
                                {/* Alerta cuando hay animales con observación */}
                                {(conNovedad > 0 || rechazados > 0) && (
                                    <div className={`rounded-2xl px-4 py-4 text-white
                                     animate-fade-in-up
                                     ${rechazados > 0 ? "bg-teja-500" : "bg-bayo-500"}`}>
                                        <p className="text-lg font-extrabold">
                                            ⚠ Atención
                                        </p>
                                        {rechazados > 0 && (
                                            <p className="font-semibold text-sm mt-1">
                                                {rechazados} {rechazados === 1
                                                    ? "cuy será rechazado"
                                                    : "cuyes serán rechazados"} (peso bajo el mínimo)
                                            </p>
                                        )}
                                        {conNovedad > 0 && (
                                            <p className="font-semibold text-sm mt-1">
                                                {conNovedad} {conNovedad === 1
                                                    ? "cuy presenta novedad"
                                                    : "cuyes presentan novedad"}
                                            </p>
                                        )}
                                        <div className="mt-2 space-y-1">
                                            {cuyes.map((c, i) => {
                                                const ev = evaluarCuy(c);
                                                if (ev.nivel !== "novedad" && ev.nivel !== "rechazo")
                                                    return null;
                                                return (
                                                    <p key={i} className="text-xs opacity-95">
                                                        Cuy #{i + 1}: {ev.motivos.join(", ")}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Aviso aparte, en azul: el sobrepeso no rechaza ni
                                    obliga a nada, solo informa que el animal sale del
                                    rango comercial. En su propio bloque porque un lote
                                    puede tener solo sobrepeso y ninguna novedad. */}
                                {conSobrepeso > 0 && (
                                    <div className="rounded-2xl px-4 py-4 bg-info-500 text-white
                                     animate-fade-in-up">
                                        <p className="text-lg font-extrabold">Información</p>
                                        <p className="font-semibold text-sm mt-1">
                                            {conSobrepeso} {conSobrepeso === 1
                                                ? "cuy supera los 1300 g"
                                                : "cuyes superan los 1300 g"}. Se
                                            aceptan; quedan fuera del rango comercial.
                                        </p>
                                        <div className="mt-2 space-y-1">
                                            {cuyes.map((c, i) => {
                                                const ev = evaluarCuy(c);
                                                if (ev.nivel !== "sobrepeso") return null;
                                                return (
                                                    <p key={i} className="text-xs opacity-95">
                                                        Cuy #{i + 1}: {ev.motivos.join(", ")}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {[
                                    ["Productora", productoraElegida
                                        ? `${productoraElegida.nombreCompleto} (${productoraElegida.comunidad})`
                                        : "—"],
                                    ["Centro de acopio", CENTROS_ACOPIO.find(
                                        c => c.value === centroAcopio)?.label ?? centroAcopio],
                                    ["Cantidad", `${cuyes.length} cuyes`],
                                    ["Peso del lote", `${pesoTotal.toLocaleString("es-EC")} g`
                                        + (pesoPromedio ? ` (${pesoPromedio} g promedio)` : "")],
                                    ["Sin observación", `${cuyes.length - conNovedad - rechazados} cuyes`],
                                    ["En ayunas", enAyunas ? "Sí" : "No"],
                                    ["Recibe", responsable],
                                ].map(([k, v]) => (
                                    <div key={k as string}
                                        className="bg-white rounded-2xl border border-gray-200
                               px-4 py-3 flex items-center justify-between gap-4">
                                        <span className="text-xs font-bold uppercase tracking-wide
                                     text-gray-400 shrink-0">{k}</span>
                                        <span className="text-sm font-semibold text-gray-900
                                     text-right">{v}</span>
                                    </div>
                                ))}

                                {observaciones && (
                                    <div className="bg-white rounded-2xl border border-gray-200
                                    px-4 py-3">
                                        <p className="text-xs font-bold uppercase tracking-wide
                                      text-gray-400 mb-1">Observaciones</p>
                                        <p className="text-sm text-gray-700">{observaciones}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="bg-teja-50 border border-teja-100 rounded-2xl
                              px-4 py-3 text-sm text-teja-700">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Botones de navegación */}
                <div className="px-6 py-4 border-t border-gray-200 bg-white
                        rounded-b-3xl flex gap-3">
                    <button
                        type="button"
                        onClick={() => paso === 1 ? onClose() : setPaso(paso - 1)}
                        className="h-14 px-6 rounded-2xl border-2 border-gray-300
                       text-base font-semibold text-gray-700
                       hover:bg-gray-50 transition active:scale-[0.98]"
                    >
                        {paso === 1 ? "Cancelar" : "← Atrás"}
                    </button>

                    {paso < TOTAL_PASOS ? (
                        <button
                            type="button"
                            disabled={!puedeAvanzar()}
                            onClick={() => {
                                if (paso === 2) setCuyActual(0);
                                setPaso(paso + 1);
                            }}
                            className="flex-1 h-14 rounded-2xl bg-primary-600 text-white
                         text-base font-bold hover:bg-primary-700
                         disabled:bg-gray-300 disabled:cursor-not-allowed
                         transition active:scale-[0.98]"
                        >
                            {paso === 3 && cuyes.some((c) => c.pesoGramos <= 0)
                                ? "Pesa todos los cuyes para seguir"
                                : "Siguiente →"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleGuardar}
                            className={`flex-1 h-14 rounded-2xl text-white text-base
                          font-bold transition active:scale-[0.98]
                          ${isOnline
                                    ? "bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300"
                                    : "bg-bayo-600 hover:bg-bayo-700 disabled:bg-bayo-400"}`}
                        >
                            {loading ? "Guardando…"
                                : isOnline ? "✓ Guardar entrega"
                                    : "✓ Guardar sin conexión"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
