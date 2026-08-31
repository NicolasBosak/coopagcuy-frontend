import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { faenamientoApi } from "../api/faenamiento";
import { MapaOrigen } from "../components/publico/MapaOrigen";
import { PLANTA } from "../domain/comunidades/coordenadas";

const fecha = (v: string) => new Date(v).toLocaleDateString("es-EC", {
    day: "2-digit", month: "long", year: "numeric",
});

/* Un azulejo por logo, igual que en el login: los PNG institucionales traen
   fondo blanco opaco, así que el blanco es superficie declarada. */
function Azulejo({ src, nombre, caja, alto, retraso = 0, prioritario = false }: {
    src: string; nombre: string; caja: string; alto: string;
    retraso?: number;
    /* Los dos logos de la cabecera son lo primero que ve quien escanea el
       QR, a menudo con datos móviles flojos: se cargan de inmediato. */
    prioritario?: boolean;
}) {
    return (
        <div className={`azulejo ${caja} animate-fade-in-up`}
            style={{ animationDelay: `${retraso}ms` }}>
            <img src={src} alt={nombre}
                loading={prioritario ? "eager" : "lazy"}
                fetchPriority={prioritario ? "high" : "auto"}
                className={`${alto} w-auto max-w-full object-contain`} />
        </div>
    );
}

function Nivel({ etiqueta }: { etiqueta: string }) {
    return (
        <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-gray-300" />
            <span className="text-[11px] font-semibold uppercase
                       tracking-[0.18em] text-gray-500 whitespace-nowrap">
                {etiqueta}
            </span>
            <span className="h-px flex-1 bg-gray-300" />
        </div>
    );
}

/* Un eslabón de la cadena. El orden importa de verdad aquí: es el recorrido
   real del animal, del centro de acopio al mercado. Por eso lleva espinazo
   con nodos y no una lista de tarjetas sueltas. */
function Eslabon({ titulo, cuando, ultimo, retraso, children }: {
    titulo: string; cuando?: string; ultimo: boolean; retraso: number;
    children: ReactNode;
}) {
    return (
        <li className="relative pl-8 pb-6 last:pb-0 animate-fade-in-up"
            style={{ animationDelay: `${retraso}ms` }}>
            {/* El hilo que une los eslabones */}
            {!ultimo && (
                <span className="absolute left-[7px] top-4 bottom-0 w-px
                           bg-primary-200" aria-hidden="true" />
            )}
            {/* El nodo. El último es oliva: ahí termina el recorrido. */}
            <span aria-hidden="true"
                className={`absolute left-0 top-1.5 w-4 h-4 rounded-full
                    ring-4 ring-primary-50
                    ${ultimo ? "bg-oliva-400" : "bg-primary-600"}`} />

            <div className="flex items-baseline justify-between gap-3 mb-2">
                <h2 className="text-sm font-bold uppercase tracking-wide
                         text-primary-800 font-sans">
                    {titulo}
                </h2>
                {cuando && (
                    <time className="text-xs text-gray-500 shrink-0">{cuando}</time>
                )}
            </div>
            <div className="bg-blanco rounded-xl border border-gray-200 p-4">
                {children}
            </div>
        </li>
    );
}

/* Filas etiqueta/valor. Un solo lugar donde se decide cómo se ve un dato. */
function Datos({ filas }: { filas: [string, ReactNode][] }) {
    return (
        <dl className="space-y-2 text-sm">
            {filas.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                    <dt className="text-gray-500 shrink-0">{k}</dt>
                    <dd className="text-gray-800 font-medium text-right max-w-[60%]">
                        {v}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <section className="bg-blanco rounded-xl border border-gray-200 p-4">
            <h2 className="text-xs font-bold text-primary-700 uppercase
                     tracking-wide mb-3 font-sans">
                {titulo}
            </h2>
            {children}
        </section>
    );
}

export default function QRPublico() {
    const { codigoLote } = useParams<{ codigoLote: string }>();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["qr_publico", codigoLote],
        queryFn: () => faenamientoApi.paginaPublica(codigoLote!),
        enabled: !!codigoLote,
        retry: false,
    });

    if (isLoading) return (
        <div className="min-h-screen bg-superficie flex items-center
                    justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-600
                        border-t-transparent rounded-full animate-spin
                        mx-auto mb-4" />
                <p className="text-sm text-primary-700">
                    Cargando información del producto…
                </p>
            </div>
        </div>
    );

    if (isError || !data) return (
        <div className="min-h-screen bg-superficie flex items-center
                    justify-center p-4">
            <div className="text-center max-w-sm">
                <div className="filo h-1 w-10 rounded-full mx-auto mb-5" />
                <h1 className="text-lg text-gray-900 mb-2">
                    Este código no corresponde a ningún lote
                </h1>
                <p className="text-sm text-gray-500">
                    Revisa que el QR se haya escaneado completo. Si el problema
                    sigue, avisa en el punto de venta donde compraste el producto.
                </p>
            </div>
        </div>
    );

    // La cadena real, en el orden en que ocurrió. Solo aparecen los eslabones
    // que efectivamente sucedieron: si un lote todavía no se comercializó, la
    // cadena termina antes y eso también es información.
    const cadena: { titulo: string; cuando?: string; contenido: ReactNode }[] = [
        {
            titulo: "Origen",
            cuando: fecha(data.fechaRecepcion),
            contenido: <Datos filas={[
                ["Comunidad", data.comunidadOrigen],
                // Sin productora asociada el API no puede nombrar un
                // cantón y responde "—" (QRService.ConstruirPaginaAsync):
                // "—, Ecuador" leería raro con un guion junto al país, así
                // que ese caso muestra solo la provincia.
                ["Cantón", data.canton === "—"
                    ? data.provincia
                    : `${data.canton}, ${data.provincia}`],
                ["Centro de acopio", data.centroAcopio],
                ["Productora", data.nombreProductora],
                ["Animales", `${data.cantidadAnimales} cuyes`],
            ]} />,
        },
    ];

    if (data.fechaSalidaCat || data.fechaLlegadaPlanta) {
        cadena.push({
            titulo: "Transporte a planta",
            contenido: <Datos filas={[
                ...(data.fechaSalidaCat
                    ? [["Salida del centro de acopio", fecha(data.fechaSalidaCat)] as [string, ReactNode]]
                    : []),
                ...(data.fechaLlegadaPlanta
                    ? [["Llegada a planta", fecha(data.fechaLlegadaPlanta)] as [string, ReactNode]]
                    : []),
            ]} />,
        });
    }

    cadena.push({
        titulo: "Faenamiento",
        cuando: fecha(data.fechaFaenamiento),
        contenido: <Datos filas={[
            ["Peso promedio canal", `${data.pesoPromedioCanalGramos} g`],
            ["Estado canal", data.estadoCanal],
            // El nombre de la planta sale del catálogo, no de un literal:
            // estuvo escrito a mano aquí y "Centro de Faenamiento de Cuyes"
            // en coordenadas.ts, y nada obligaba a que coincidieran.
            ["Planta", `${PLANTA.nombre}, ${PLANTA.canton}`],
        ]} />,
    });

    if (data.fechaComercializacion) {
        cadena.push({
            titulo: "Comercialización",
            cuando: fecha(data.fechaComercializacion),
            contenido: <Datos filas={[
                ...(data.tipoMercado
                    ? [["Mercado", data.tipoMercado
                        + (data.ubicacionMercado ? ` · ${data.ubicacionMercado}` : "")] as [string, ReactNode]]
                    : []),
                ...(data.destinoComercial
                    ? [["Destino", data.destinoComercial] as [string, ReactNode]]
                    : []),
            ]} />,
        });
    }

    return (
        <div className="min-h-screen bg-superficie">

            {/* ── Cabecera: quién responde por este producto ─────────────── */}
            <header className="bg-blanco border-b-4 border-oliva-400">
                <div className="max-w-sm mx-auto px-4 pt-8 pb-7">
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                        <Azulejo
                            src="/brand/aliados/cuy-azuayito.png"
                            nombre="Cuy Azuayito — Sabor de altura · COOPPAGCUY"
                            caja="h-32 px-5" alto="h-24" retraso={0} prioritario
                        />
                        <Azulejo
                            src="/brand/aliados/familias-campesinas.png"
                            nombre="Familias Campesinas Liderando"
                            caja="h-32 px-5" alto="h-14" retraso={70} prioritario
                        />
                    </div>

                    <div className="text-center mt-6 animate-fade-in-up"
                        style={{ animationDelay: "140ms" }}>
                        <h1 className="text-2xl text-gray-900">{data.marca}</h1>
                        <p className="text-sm text-primary-700 mt-1">
                            Trazabilidad desde el origen
                        </p>
                    </div>
                </div>
            </header>

            <div className="max-w-sm mx-auto px-4 py-7 space-y-7">

                {/* Código de lote: el dato que ata la etiqueta física a todo
                    lo que sigue. Va primero y va solo. */}
                <section className="bg-blanco rounded-xl border border-gray-200
                             p-4 animate-fade-in-up">
                    <p className="text-xs text-gray-400 mb-1">Código de lote</p>
                    <p className="font-mono text-base font-semibold text-gray-900
                            tabular-nums">
                        {data.codigoLote}
                    </p>
                </section>

                {/* ── El origen ─────────────────────────────────────────────
                    Va antes de la cadena a propósito: el mapa contesta DÓNDE y
                    la cadena contesta CUÁNDO. Quien escanea el QR en el puesto
                    de venta pregunta primero de dónde viene lo que tiene en la
                    mano.

                    `comunidadesAporte` puede venir vacío (un lote de una sola
                    productora), así que el mapa cae a la comunidad de origen,
                    que siempre está en el DTO. El mapa se dibuja siempre. */}
                <MapaOrigen
                    aportes={data.comunidadesAporte.length > 0
                        ? data.comunidadesAporte
                        : [{
                            comunidad: data.comunidadOrigen,
                            cantidad: data.cantidadAnimales,
                            // Este fallback no trae comunidad del catálogo
                            // (comunidadOrigen es un nombre ya unido, a
                            // veces de varias comunidades con " y "), así
                            // que no hay coordenada que ofrecer: el mapa
                            // queda sin pin y el texto sigue nombrándola.
                            latitud: null, longitud: null,
                            altitudMinM: null, altitudMaxM: null,
                        }]}
                />

                {/* ── La cadena ─────────────────────────────────────────────
                    Un espinazo con nodos porque esto sí es una secuencia: el
                    orden es el recorrido real del animal y el lector necesita
                    ese orden para entender de dónde viene lo que compró. */}
                <div>
                    <h2 className="text-[11px] font-semibold uppercase
                             tracking-[0.18em] text-gray-500 mb-4 font-sans">
                        Recorrido del lote
                    </h2>
                    <ol>
                        {cadena.map((paso, i) => (
                            <Eslabon
                                key={paso.titulo}
                                titulo={paso.titulo}
                                cuando={paso.cuando}
                                ultimo={i === cadena.length - 1}
                                retraso={180 + i * 70}
                            >
                                {paso.contenido}
                            </Eslabon>
                        ))}
                    </ol>
                </div>

                {/* ── Lo que no es secuencia ────────────────────────────────
                    Atributos del lote: no tienen orden temporal, así que van
                    en tarjetas y no en la cadena.

                    La tarjeta "Comunidades que aportaron" vivía aquí y se
                    quitó: el mapa de arriba muestra el mismo dato con la misma
                    cantidad y además dónde queda cada una. Dejar las dos era
                    repetir la misma lista dos veces en una pantalla de
                    teléfono. */}

                <Tarjeta titulo="Controles de calidad aprobados">
                    <ul className="space-y-1.5">
                        {data.parametrosAprobados.map((p, i) => (
                            <li key={i} className="text-sm text-gray-700">{p}</li>
                        ))}
                    </ul>
                </Tarjeta>

            </div>

            {/* ── Quiénes sostienen el proyecto ──────────────────────────
                Misma jerarquía que en el login: primero quien cofinancia y
                ejecuta, después los aliados locales. */}
            <footer className="bg-blanco border-t border-gray-200 mt-4">
                <div className="max-w-sm mx-auto px-4 py-9 space-y-6">
                    <Nivel etiqueta="Con el apoyo de" />
                    <div className="flex flex-wrap justify-center gap-3">
                        <Azulejo
                            src="/brand/aliados/ayuda-en-accion.png"
                            nombre="Ayuda en Acción"
                            caja="h-20 px-6" alto="h-8"
                        />
                        <Azulejo
                            src="/brand/aliados/union-europea.png"
                            nombre="Cofinanciado por la Unión Europea"
                            caja="h-20 px-6" alto="h-8"
                        />
                    </div>

                    <Nivel etiqueta="Aliados locales" />
                    <div className="flex flex-wrap justify-center gap-2.5">
                        <Azulejo src="/brand/aliados/nabon.png"
                            nombre="Alcaldía de Nabón" caja="h-[70px] px-4" alto="h-8" />
                        <Azulejo src="/brand/aliados/santa-isabel.png"
                            nombre="Alcaldía de Santa Isabel" caja="h-[70px] px-4" alto="h-9" />
                        <Azulejo src="/brand/aliados/pucara.png"
                            nombre="Alcaldía de Pucará" caja="h-[70px] px-4" alto="h-9" />
                        <Azulejo src="/brand/aliados/universidad-catolica.png"
                            nombre="Universidad Católica de Cuenca" caja="h-[70px] px-4" alto="h-9" />
                    </div>

                    <p className="text-center text-[11px] text-gray-400 pt-2
                            leading-relaxed">
                        COOPAGCUY · Azuay, Ecuador
                        <br />
                        Proyecto Familias Campesinas Liderando
                        <br />
                        Cofinanciado por la Unión Europea · Ayuda en Acción
                    </p>
                </div>
            </footer>
        </div>
    );
}
