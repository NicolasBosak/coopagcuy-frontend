import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportesApi } from "../api/reportes";
import { descargarBlob } from "../utils/download";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";
import { Segmentado } from "../components/ui/Segmentado";
import { FiltrosPeriodo } from "../components/reportes/FiltrosPeriodo";
import { BarrasCalidad, type FilaBarras } from "../components/reportes/graficos/BarrasCalidad";
import { AnilloNovedades } from "../components/reportes/graficos/AnilloNovedades";
import { AnilloConteos } from "../components/reportes/graficos/AnilloConteos";
import {
    BarrasAgrupadas, type FilaAgrupada, type SerieBarras,
} from "../components/reportes/graficos/BarrasAgrupadas";
import {
    BarrasDivergentes, type FilaDivergente,
} from "../components/reportes/graficos/BarrasDivergentes";
import { StatCard } from "../components/ui/StatCard";
import type { MargenDto } from "../types/reportes";
import { useAuth } from "../context/useAuth";
import { fechaLocal } from "../utils/fechaLocal";

type Tab = "entrada" | "transito" | "salida"
    | "productoras" | "cat" | "novedades" | "devoluciones" | "ganancias";

// El flujo físico del producto (entrada → tránsito → salida) es operación. El
// admin técnico conserva los reportes de gestión y calidad, no esos tres: la
// API le devuelve 403 en ellos, así que mostrárselos solo produciría un error
// de carga sin explicación.
const TABS: { id: Tab; label: string }[] = [
    { id: "entrada", label: "Entrada" },
    { id: "transito", label: "Tránsito" },
    { id: "salida", label: "Salida" },
    { id: "productoras", label: "Por productora" },
    { id: "cat", label: "Por CAT" },
    { id: "novedades", label: "Novedades" },
    { id: "devoluciones", label: "Devoluciones" },
    { id: "ganancias", label: "Ganancias" },
];

const TABS_FLUJO: Tab[] = ["entrada", "transito", "salida"];

// El OperadorCAT no tiene ninguno de los seis endpoints de ganancias/margen
// (403 en todos): mostrarle la pestaña solo produciría un error de carga sin
// explicación, igual que con el admin técnico y el flujo físico.
function tabsVisibles(rol: string | null) {
    let visibles = TABS;
    if (rol === "AdminTecnico")
        visibles = visibles.filter((t) => !TABS_FLUJO.includes(t.id));
    if (rol === "OperadorCAT")
        visibles = visibles.filter((t) => t.id !== "ganancias");
    return visibles;
}

type GananciaVista = "productora" | "cat" | "mes";
type MargenVista = "mes" | "cliente";

const GANANCIA_VISTAS: { id: GananciaVista; label: string }[] = [
    { id: "productora", label: "Por productora" },
    { id: "cat", label: "Por CAT" },
    { id: "mes", label: "Por mes" },
];

const MARGEN_VISTAS: { id: MargenVista; label: string }[] = [
    { id: "mes", label: "Por mes" },
    { id: "cliente", label: "Por cliente" },
];

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(anio: number, mes: number) {
    return `${MESES[mes - 1] ?? mes} ${anio}`;
}

// "yyyy-MM" tal como lo agrupa el servidor (mes local del piloto)
function nombreMesAgrupacion(agrupacion: string) {
    const [anio, mes] = agrupacion.split("-").map(Number);
    return Number.isFinite(anio) && Number.isFinite(mes)
        ? nombreMes(anio, mes)
        : agrupacion;
}

// El margen puede ser negativo (pérdida); "$-12.50" lee raro, así que el
// signo va antes del símbolo de moneda.
function usd(v: number) {
    return v < 0 ? `-$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`;
}

/**
 * Una columna declara su rótulo y su alineación JUNTOS.
 *
 * Antes no era así y por eso la tabla se leía torcida: `EncabezadoTabla`
 * ponía `text-left` en todas las columnas mientras `FilaGanancia` y
 * `FilaMargen` alineaban el dinero a la derecha y los conteos al centro. El
 * rótulo "Cobrado local" quedaba pegado al borde izquierdo de su columna y
 * $4 820.00 al derecho.
 *
 * Poner `text-right` a mano en cada `<th>` habría tapado el síntoma dejando
 * viva la causa: la alineación del encabezado y la de la celda vivían en dos
 * componentes distintos y nada obligaba a que coincidieran, así que la
 * siguiente columna que alguien agregara volvería a desalinearse. Ahora el
 * encabezado y la celda salen del MISMO objeto y no pueden discrepar.
 */
type Alineacion = "izq" | "der" | "centro";

interface Col {
    label: string;
    align: Alineacion;
    /** Color del texto de la celda. El encabezado tiene el suyo propio. */
    tono?: string;
}

const ALINEACION: Record<Alineacion, string> = {
    izq: "text-left",
    der: "text-right",
    centro: "text-center",
};

// ── Columnas de las tablas de ganancias y margen ────────────────────
//
// Las tres vistas de ganancia comparten las mismas cuatro columnas de
// dinero/conteo; solo cambian las columnas identificadoras de la izquierda.

const COLS_ID_PRODUCTORA: Col[] = [
    { label: "Productora", align: "izq" },
    { label: "Comunidad", align: "izq" },
    { label: "CAT", align: "izq" },
];
const COLS_ID_CAT: Col[] = [{ label: "CAT", align: "izq" }];
const COLS_ID_MES: Col[] = [{ label: "Mes", align: "izq" }];
const COLS_ID_CLIENTE: Col[] = [{ label: "Cliente", align: "izq" }];

const COLS_DINERO_GANANCIA: Col[] = [
    { label: "Cobrado local", align: "der", tono: "text-gray-700" },
    { label: "Pactado a cuotas", align: "der", tono: "text-gray-700" },
    { label: "Pagado por planta", align: "der", tono: "text-gray-700" },
    { label: "N.º de pagos", align: "centro", tono: "text-gray-500" },
];

const COLS_DINERO_MARGEN: Col[] = [
    { label: "Ingreso (neto de devoluciones)", align: "der", tono: "text-gray-700" },
    { label: "Costo atribuido", align: "der", tono: "text-gray-700" },
    { label: "Margen", align: "der" },
    { label: "Despachos sin precio", align: "centro" },
    { label: "Animales sin costo", align: "centro" },
    { label: "Unidades devueltas", align: "centro" },
];

// Las tres series del gráfico de ganancias. Mismo orden y mismo significado
// que las columnas de la tabla, para que el ojo no tenga que reaprenderlas.
const SERIES_GANANCIA: SerieBarras[] = [
    { key: "cobradoLocal", nombre: "Cobrado local", color: "bg-primary-600" },
    { key: "pactadoCuotas", nombre: "Pactado a cuotas", color: "bg-info-500" },
    { key: "pagadoPlanta", nombre: "Pagado por planta", color: "bg-primary-300" },
];

// Cabecera compartida por las tablas de ganancias y margen: mismas clases,
// solo cambian los rótulos y la alineación, que vienen en la propia columna.
function EncabezadoTabla({ columnas }: { columnas: Col[] }) {
    return (
        <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
                {columnas.map(c => (
                    <th key={c.label} className={`px-3 py-3 text-xs
                             font-medium text-gray-500 uppercase tracking-wide
                             whitespace-nowrap ${ALINEACION[c.align]}`}>
                        {c.label}
                    </th>
                ))}
            </tr>
        </thead>
    );
}

// Las tres vistas de "lo que cobraron las productoras" comparten estas
// cuatro columnas de dinero/conteo; solo cambian las celdas identificadoras
// de la izquierda (productora+comunidad+CAT, o CAT solo, o mes).
type FilaDineroGanancia = {
    cobradoLocal: number;
    pactadoCuotas: number;
    pagadoPlanta: number;
    totalPagos: number; // conteo de pagos, no dinero
};

// Une cada valor con SU columna: la alineación de la celda sale del mismo
// objeto que rotula el encabezado.
function Celdas({ columnas, valores }: {
    columnas: Col[];
    valores: { contenido: React.ReactNode; clase?: string }[];
}) {
    return (
        <>
            {columnas.map((c, i) => (
                <td key={c.label}
                    className={`px-3 py-2.5 ${ALINEACION[c.align]} ${valores[i].clase ?? c.tono ?? ""
                        }`}>
                    {valores[i].contenido}
                </td>
            ))}
        </>
    );
}

function FilaGanancia({ celdas, r }: { celdas: React.ReactNode; r: FilaDineroGanancia }) {
    return (
        <tr className="hover:bg-gray-50">
            {celdas}
            <Celdas columnas={COLS_DINERO_GANANCIA} valores={[
                { contenido: usd(r.cobradoLocal) },
                { contenido: usd(r.pactadoCuotas) },
                { contenido: usd(r.pagadoPlanta) },
                { contenido: r.totalPagos },
            ]} />
        </tr>
    );
}

// Los tres contadores de calidad de dato del margen se pintan igual: una
// insignia si hay algo que avisar, un cero gris si no. Un despacho sin precio
// no se vendió gratis y un animal cuya productora no ha cobrado no costó
// cero, así que nunca se cuentan como parte de la cifra.
function contador(n: number, texto: string) {
    return n > 0
        ? <Badge label={`${n} ${texto}`} variant="warning" />
        : <span className="text-gray-400">0</span>;
}

// Las dos vistas de margen comparten estas seis columnas; solo cambia la
// celda de agrupación de la izquierda (mes, o cliente).
function FilaMargen({ primeraCelda, r }: { primeraCelda: React.ReactNode; r: MargenDto }) {
    return (
        <tr className="hover:bg-gray-50">
            {primeraCelda}
            <Celdas columnas={COLS_DINERO_MARGEN} valores={[
                { contenido: usd(r.ingreso) },
                { contenido: usd(r.costoAtribuido) },
                {
                    contenido: usd(r.margen),
                    // El margen puede ser pérdida: mismo rojo que el resto
                    // del sistema usa para "no salió bien".
                    clase: `font-bold ${r.margen < 0
                        ? "text-teja-700" : "text-primary-700"}`,
                },
                { contenido: contador(r.despachosSinPrecio, "sin precio") },
                { contenido: contador(r.animalesSinCosto, "sin costo") },
                { contenido: contador(r.unidadesDevueltas, "devueltas") },
            ]} />
        </tr>
    );
}

function inicioMes() {
    const d = new Date();
    return fechaLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}
function hoy() {
    return fechaLocal();
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
    const { auth } = useAuth();
    const visibles = useMemo(() => tabsVisibles(auth.rol), [auth.rol]);
    // La pestaña inicial es la primera visible: abrir en "entrada" dejaría al
    // admin técnico mirando un error de carga nada más entrar.
    const [tab, setTab] = useState<Tab>(visibles[0].id);
    const [desde, setDesde] = useState(inicioMes());
    const [hasta, setHasta] = useState(hoy());
    const [cat, setCat] = useState<string>("");
    const [exportando, setExportando] = useState(false);
    const [exportandoGeneral, setExportandoGeneral] = useState(false);
    const [gananciaVista, setGananciaVista] = useState<GananciaVista>("productora");
    const [margenVista, setMargenVista] = useState<MargenVista>("mes");

    const filtro = { desde, hasta, cat: cat || undefined };
    // El margen nunca acepta `cat` — ver la nota en src/api/reportes.ts.
    const filtroSinCat = { desde, hasta };

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

    // ── Ganancias de productoras: lo que cobraron, sí filtra por CAT ────

    const {
        data: gananciaProdData = [], isLoading: loadingGananciaProd, isError: errorGananciaProd,
    } = useQuery({
        queryKey: ["ganancia_productoras", desde, hasta, cat],
        queryFn: () => reportesApi.gananciasPorProductora(filtro),
        enabled: tab === "ganancias" && gananciaVista === "productora",
    });

    const {
        data: gananciaCatData = [], isLoading: loadingGananciaCat, isError: errorGananciaCat,
    } = useQuery({
        queryKey: ["ganancia_cat", desde, hasta, cat],
        queryFn: () => reportesApi.gananciasPorCat(filtro),
        enabled: tab === "ganancias" && gananciaVista === "cat",
    });

    const {
        data: gananciaMesData = [], isLoading: loadingGananciaMes, isError: errorGananciaMes,
    } = useQuery({
        queryKey: ["ganancia_mes", desde, hasta, cat],
        queryFn: () => reportesApi.gananciasPorMes(filtro),
        enabled: tab === "ganancias" && gananciaVista === "mes",
    });

    // ── Margen de la reventa: siempre toda la cooperativa, nunca por CAT ─

    const {
        data: margenMesData = [], isLoading: loadingMargenMes, isError: errorMargenMes,
    } = useQuery({
        queryKey: ["margen_mes", desde, hasta],
        queryFn: () => reportesApi.margenPorMes(filtroSinCat),
        enabled: tab === "ganancias" && margenVista === "mes",
    });

    const {
        data: margenClienteData = [], isLoading: loadingMargenCliente, isError: errorMargenCliente,
    } = useQuery({
        queryKey: ["margen_cliente", desde, hasta],
        queryFn: () => reportesApi.margenPorCliente(filtroSinCat),
        enabled: tab === "ganancias" && margenVista === "cliente",
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

    // ── Agregados de ganancias y margen ────────────────────────────────
    //
    // REGLA: cada tarjeta y cada barra se calcula sobre EL MISMO arreglo que
    // pinta la tabla de abajo, nunca con una consulta aparte. Así el gráfico
    // y la tabla no pueden contradecirse en pantalla aunque el servidor
    // cambie de criterio. Es el patrón que ya usan barrasProductoras y
    // conteoNovedades.

    // Cuál de las tres vistas está cargada. Las tres parten exactamente el
    // mismo conjunto de pagos con el mismo criterio (SumarPorCanal en el
    // API), así que los totales NO cambian al cambiar de vista: por eso las
    // tarjetas van encima del selector y no dentro de cada vista.
    const gananciaFilas: FilaDineroGanancia[] =
        gananciaVista === "productora" ? gananciaProdData
            : gananciaVista === "cat" ? gananciaCatData
                : gananciaMesData;

    const totalGanancia = useMemo(() => gananciaFilas.reduce((acc, r) => ({
        cobradoLocal: acc.cobradoLocal + r.cobradoLocal,
        pactadoCuotas: acc.pactadoCuotas + r.pactadoCuotas,
        pagadoPlanta: acc.pagadoPlanta + r.pagadoPlanta,
        totalPagos: acc.totalPagos + r.totalPagos,
    }), { cobradoLocal: 0, pactadoCuotas: 0, pagadoPlanta: 0, totalPagos: 0 }),
        [gananciaFilas]);

    // Las filas del gráfico, ordenadas por el canal que más pesa en la vista.
    // No se ordenan por la suma de los tres: esa suma no existe en ninguna
    // celda de este reporte, y usarla aquí la haría existir de contrabando.
    const barrasGanancia: FilaAgrupada[] = useMemo(() => {
        // Las claves son las de SERIES_GANANCIA; se escriben una sola vez
        // aquí en vez de colar el DTO entero con un cast.
        const canales = (r: FilaDineroGanancia) => ({
            cobradoLocal: r.cobradoLocal,
            pactadoCuotas: r.pactadoCuotas,
            pagadoPlanta: r.pagadoPlanta,
        });

        const filas: FilaAgrupada[] = gananciaVista === "productora"
            ? gananciaProdData.map((r) => ({
                etiqueta: r.nombreProductora,
                sublabel: `${r.comunidad} · ${r.centroAcopio}`,
                valores: canales(r),
            }))
            : gananciaVista === "cat"
                ? gananciaCatData.map((r) => ({
                    etiqueta: r.centroAcopio,
                    valores: canales(r),
                }))
                : gananciaMesData.map((r) => ({
                    etiqueta: nombreMes(r.anio, r.mes),
                    valores: canales(r),
                }));

        // El mes conserva su orden cronológico; las otras dos vistas se
        // ordenan por lo cobrado, igual que las ordena el servidor.
        return gananciaVista === "mes"
            ? filas
            : [...filas].sort((a, b) =>
                b.valores.cobradoLocal - a.valores.cobradoLocal);
    }, [gananciaVista, gananciaProdData, gananciaCatData, gananciaMesData]);

    const margenFilas: MargenDto[] =
        margenVista === "mes" ? margenMesData : margenClienteData;

    const totalMargen = useMemo(() => margenFilas.reduce((acc, r) => ({
        ingreso: acc.ingreso + r.ingreso,
        costoAtribuido: acc.costoAtribuido + r.costoAtribuido,
        margen: acc.margen + r.margen,
        despachosSinPrecio: acc.despachosSinPrecio + r.despachosSinPrecio,
        animalesSinCosto: acc.animalesSinCosto + r.animalesSinCosto,
        unidadesDevueltas: acc.unidadesDevueltas + r.unidadesDevueltas,
    }), {
        ingreso: 0, costoAtribuido: 0, margen: 0,
        despachosSinPrecio: 0, animalesSinCosto: 0, unidadesDevueltas: 0,
    }), [margenFilas]);

    const barrasMargen: FilaDivergente[] = useMemo(() =>
        margenFilas.map((r) => ({
            etiqueta: margenVista === "mes"
                ? nombreMesAgrupacion(r.agrupacion)
                : (r.agrupacion || "(sin cliente)"),
            valor: r.margen,
        })), [margenFilas, margenVista]);

    // Los tres contadores de calidad de dato, en una sola frase. Un gráfico
    // que los ignore muestra el margen con más confianza de la que merece.
    const avisosMargen = [
        totalMargen.despachosSinPrecio > 0
        && `${totalMargen.despachosSinPrecio} despachos sin precio`,
        totalMargen.animalesSinCosto > 0
        && `${totalMargen.animalesSinCosto} animales sin costo`,
        totalMargen.unidadesDevueltas > 0
        && `${totalMargen.unidadesDevueltas} unidades devueltas`,
    ].filter(Boolean) as string[];

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
            } else if (tab === "ganancias") {
                const blob = await reportesApi.exportarExcelGanancias(filtro);
                // El nombre es el único lugar donde el alcance por CAT
                // sobrevive fuera del archivo: sin el sufijo, exportar por
                // PAT y luego por NIE del mismo período produce dos
                // descargas indistinguibles por nombre.
                descargarBlob(
                    blob,
                    `Reporte-Ganancias-${desde}-${hasta}${cat ? `-${cat}` : ""}.xlsx`
                );
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

            <div className="mb-5">
                <Segmentado
                    activo={tab}
                    onCambio={setTab}
                    opciones={visibles}
                />
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
                                        <td className="px-3 py-2.5 text-center text-primary-700">
                                            {r.lotesAceptados}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-yellow-700">
                                            {r.lotesConNovedad}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-teja-700">
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
                                        <span className="text-primary-700">Aceptados</span>
                                        <span className="font-medium text-primary-700">{r.lotesAceptados}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-yellow-600">Con novedad</span>
                                        <span className="font-medium text-yellow-700">{r.lotesConNovedad}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-teja-600">Rechazados</span>
                                        <span className="font-medium text-teja-700">{r.lotesRechazados}</span>
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

            {/* Tab: Ganancias — dos cifras que NUNCA se suman: lo que
                cobraron las productoras (ingreso suyo, egreso de la
                cooperativa) y el margen de la reventa (lo que le queda a la
                cooperativa). Van en bloques separados a propósito: juntarlas
                en una tabla invitaría a restarlas mal. */}
            {tab === "ganancias" && (
                <div className="space-y-8 animate-fade-in-up">
                    {/* Bloque 1: lo que cobraron las productoras */}
                    <section>
                        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                            <div>
                                <h2 className="text-base font-bold text-gray-800">
                                    Lo que cobraron las productoras
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                                    Su ingreso — y el egreso de la cooperativa. No se suma
                                    con el margen de abajo.
                                </p>
                            </div>
                        </div>

                        {/* Las tres cifras del período, cada una en su tarjeta y
                            SIN un total: cobrado, pactado y pagado por planta nunca
                            se suman entre sí. Van encima del selector porque no
                            cambian al cambiar de vista — las tres vistas parten el
                            mismo conjunto de pagos. */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                            <StatCard
                                label="Cobrado local"
                                value={usd(totalGanancia.cobradoLocal)}
                                sublabel="la CAT ya lo recibió; la productora aún no"
                                color="green" delay={0}
                            />
                            <StatCard
                                label="Pactado a cuotas"
                                value={usd(totalGanancia.pactadoCuotas)}
                                sublabel="comprometido, todavía no llega"
                                color="blue" delay={60}
                            />
                            <StatCard
                                label="Pagado por planta"
                                value={usd(totalGanancia.pagadoPlanta)}
                                sublabel="la otra vía de cobro"
                                color="gray" delay={120}
                            />
                            <StatCard
                                label="Pagos registrados"
                                value={totalGanancia.totalPagos}
                                sublabel="operaciones en el período"
                                color="gray" delay={180}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <Segmentado
                                activo={gananciaVista}
                                onCambio={setGananciaVista}
                                opciones={GANANCIA_VISTAS}
                            />
                        </div>

                        <div className="mb-5">
                            <BarrasAgrupadas
                                titulo={`Comparación por canal · ${GANANCIA_VISTAS
                                    .find((v) => v.id === gananciaVista)?.label}`}
                                series={SERIES_GANANCIA}
                                filas={barrasGanancia}
                                formato={usd}
                            />
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                            {gananciaVista === "productora" && (
                                <PanelEstado
                                    cargando={loadingGananciaProd}
                                    error={errorGananciaProd}
                                    vacio={gananciaProdData.length === 0}
                                    mensajeVacio="No hay pagos a productoras en el período."
                                >
                                    <table className="w-full text-sm">
                                        <EncabezadoTabla
                                            columnas={[...COLS_ID_PRODUCTORA,
                                            ...COLS_DINERO_GANANCIA]} />
                                        <tbody className="divide-y divide-gray-100">
                                            {gananciaProdData.map((r) => (
                                                <FilaGanancia
                                                    key={r.productoraId}
                                                    r={r}
                                                    celdas={<>
                                                        <td className="px-3 py-2.5 font-medium text-gray-800">
                                                            {r.nombreProductora}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-gray-600">
                                                            {r.comunidad}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <Badge label={r.centroAcopio} variant="neutral" />
                                                        </td>
                                                    </>}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </PanelEstado>
                            )}

                            {gananciaVista === "cat" && (
                                <PanelEstado
                                    cargando={loadingGananciaCat}
                                    error={errorGananciaCat}
                                    vacio={gananciaCatData.length === 0}
                                    mensajeVacio="No hay pagos a productoras en el período."
                                >
                                    <table className="w-full text-sm">
                                        <EncabezadoTabla
                                            columnas={[...COLS_ID_CAT, ...COLS_DINERO_GANANCIA]} />
                                        <tbody className="divide-y divide-gray-100">
                                            {gananciaCatData.map((r) => (
                                                <FilaGanancia
                                                    key={r.centroAcopio}
                                                    r={r}
                                                    celdas={
                                                        <td className="px-3 py-2.5">
                                                            <Badge label={r.centroAcopio} variant="neutral" />
                                                        </td>
                                                    }
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </PanelEstado>
                            )}

                            {gananciaVista === "mes" && (
                                <PanelEstado
                                    cargando={loadingGananciaMes}
                                    error={errorGananciaMes}
                                    vacio={gananciaMesData.length === 0}
                                    mensajeVacio="No hay pagos a productoras en el período."
                                >
                                    <table className="w-full text-sm">
                                        <EncabezadoTabla
                                            columnas={[...COLS_ID_MES, ...COLS_DINERO_GANANCIA]} />
                                        <tbody className="divide-y divide-gray-100">
                                            {gananciaMesData.map((r) => (
                                                <FilaGanancia
                                                    key={`${r.anio}-${r.mes}`}
                                                    r={r}
                                                    celdas={
                                                        <td className="px-3 py-2.5 font-medium text-gray-800
                                       capitalize">
                                                            {nombreMes(r.anio, r.mes)}
                                                        </td>
                                                    }
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </PanelEstado>
                            )}
                        </div>
                    </section>

                    {/* Bloque 2: margen de la reventa */}
                    <section>
                        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                            <div>
                                <h2 className="text-base font-bold text-gray-800">
                                    Margen de la reventa
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                                    Lo que le queda a la cooperativa. No se suma con lo de
                                    arriba, y siempre es de toda la cooperativa: este bloque
                                    no se filtra por centro de acopio.
                                </p>
                            </div>
                        </div>

                        {/* Aquí sumar SÍ es la definición del dato:
                            ingreso − costo = margen. */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                            <StatCard
                                label="Ingreso"
                                value={usd(totalMargen.ingreso)}
                                sublabel="neto de devoluciones"
                                color="gray" delay={0}
                            />
                            <StatCard
                                label="Costo atribuido"
                                value={usd(totalMargen.costoAtribuido)}
                                sublabel="lo pagado por esos animales"
                                color="gray" delay={60}
                            />
                            <StatCard
                                label="Margen"
                                value={usd(totalMargen.margen)}
                                sublabel="ingreso menos costo"
                                color={totalMargen.margen < 0 ? "red" : "green"}
                                delay={120}
                            />
                        </div>

                        {/* Lo que el margen NO alcanzó a mirar. Sin esta línea, la
                            cifra de arriba se lee con más confianza de la que
                            merece: un despacho sin precio no se vendió gratis. */}
                        {avisosMargen.length > 0 && (
                            <p className="mb-5 text-xs text-bayo-700">
                                <strong className="font-semibold">
                                    {avisosMargen.join(" · ")}
                                </strong>
                                <span className="text-gray-500">
                                    {" "}— el margen del período se calculó sin esos datos.
                                </span>
                            </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <Segmentado
                                activo={margenVista}
                                onCambio={setMargenVista}
                                opciones={MARGEN_VISTAS}
                            />
                        </div>

                        {/* La asimetría del filtro por CAT: el bloque de arriba se filtró,
                            este no puede. Se avisa en el momento en que importa, no solo
                            en la descripción fija de arriba. */}
                        {cat && (
                            <div className="mb-3 rounded-lg border border-bayo-200 bg-bayo-50
                              px-4 py-2.5 text-xs text-bayo-800">
                                Filtraste <strong>{cat}</strong> arriba, pero el margen de
                                aquí abajo es de <strong>toda la cooperativa</strong>: un
                                despacho reúne animales de varias jaulas, y por tanto de
                                varias CAT, así que este reporte no acepta filtrarse por
                                centro de acopio.
                            </div>
                        )}

                        <div className="mb-5">
                            <BarrasDivergentes
                                titulo={`Margen ${margenVista === "mes"
                                    ? "por mes" : "por cliente"}`}
                                filas={barrasMargen}
                                formato={usd}
                                nota="El margen es sobre el costo de los animales: no
                                      incluye transporte, faenamiento ni empaque."
                            />
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                            {margenVista === "mes" && (
                                <PanelEstado
                                    cargando={loadingMargenMes}
                                    error={errorMargenMes}
                                    vacio={margenMesData.length === 0}
                                    mensajeVacio="No hay despachos con margen calculable en el período."
                                >
                                    <table className="w-full text-sm">
                                        <EncabezadoTabla
                                            columnas={[...COLS_ID_MES, ...COLS_DINERO_MARGEN]} />
                                        <tbody className="divide-y divide-gray-100">
                                            {margenMesData.map((r) => (
                                                <FilaMargen
                                                    key={r.agrupacion}
                                                    r={r}
                                                    primeraCelda={
                                                        <td className="px-3 py-2.5 font-medium text-gray-800
                                       capitalize">
                                                            {nombreMesAgrupacion(r.agrupacion)}
                                                        </td>
                                                    }
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </PanelEstado>
                            )}

                            {margenVista === "cliente" && (
                                <PanelEstado
                                    cargando={loadingMargenCliente}
                                    error={errorMargenCliente}
                                    vacio={margenClienteData.length === 0}
                                    mensajeVacio="No hay despachos con margen calculable en el período."
                                >
                                    <table className="w-full text-sm">
                                        <EncabezadoTabla
                                            columnas={[...COLS_ID_CLIENTE, ...COLS_DINERO_MARGEN]} />
                                        <tbody className="divide-y divide-gray-100">
                                            {/* `agrupacion` puede repetirse (varios despachos sin
                                                cliente registrado agrupan todos a ""), así que la
                                                key lleva también el índice. */}
                                            {margenClienteData.map((r, i) => (
                                                <FilaMargen
                                                    key={`${r.agrupacion}-${i}`}
                                                    r={r}
                                                    primeraCelda={
                                                        <td className="px-3 py-2.5 font-medium text-gray-800">
                                                            {r.agrupacion || "(sin cliente registrado)"}
                                                        </td>
                                                    }
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </PanelEstado>
                            )}
                        </div>

                        <p className="mt-2 text-xs text-gray-400 max-w-2xl">
                            El margen es sobre el costo de los animales: no incluye
                            transporte, faenamiento ni empaque, así que no es un resultado
                            contable de la cooperativa.
                        </p>
                    </section>
                </div>
            )}
        </MainLayout>
    );
}