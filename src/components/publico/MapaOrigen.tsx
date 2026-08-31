import {
    LIENZO, PLANTA, altitudTexto, dentroDelEncuadre, desnivelAPlanta,
    enlaceMapa, kmAPlanta, msnmMedio, proyectar, rotuloDe, type Ubicacion,
} from "../../domain/comunidades/coordenadas";
import {
    FICHA_PLANTA, descripcionDe, type Descripcion,
} from "../../domain/comunidades/descripciones";
import { CURVAS, CURVAS_INTERVALO } from "../../domain/comunidades/relieve.generado";

/**
 * De dónde salieron los cuyes de este lote, sobre el terreno real.
 *
 * NO es un mapa de la región: es el mapa de ESTE lote. Solo las comunidades
 * que aportaron animales llevan pin lleno, el tamaño del pin sale de cuántos
 * aportaron, y de cada una baja un hilo hasta la planta.
 *
 * El relieve es REAL —malla de elevación SRTM 30 m, ver scripts/relieve— y es
 * lo que hace entender el viaje. Visto en plano, 23 km parecen un paseo; con
 * el terreno debajo se ve lo que de verdad ocurre: los cuyes bajan de la
 * cordillera occidental al fondo del valle de Yunguilla, entre 1500 y 2100
 * metros de desnivel por carretera de montaña.
 *
 * Va en SVG con un PNG horneado, no con tiles de un tercero: esta página se
 * escanea en un puesto de venta con datos móviles flojos (por eso los logos
 * de la cabecera ya cargan con fetchPriority alto), la app es una PWA que
 * cachea lo suyo con Workbox y no cachearía tiles ajenos, y la paleta del
 * proveedor se impondría sobre la institucional en la única pantalla que ve
 * el consumidor final.
 */

interface Aporte {
    comunidad: string;
    cantidad: number;
    latitud: number | null;
    longitud: number | null;
    altitudMinM: number | null;
    altitudMaxM: number | null;
}

interface Props {
    aportes: Aporte[];
}

interface AporteUbicado extends Aporte {
    // No nulo mientras haya coordenada, tenga o no pin dibujado: separado de
    // `dentroDelMapa` a propósito (ver ese campo) para que una comunidad
    // fuera del encuadre horneado conserve su enlace a Google Maps y su
    // altitud en la ficha, tal como exige el comentario de cabecera de
    // `dentroDelEncuadre` en coordenadas.ts.
    ubicacion: Ubicacion | null;
    // true = la coordenada cae dentro del encuadre horneado y recibe pin en
    // el mapa. false = no hay coordenada, o la hay pero cae fuera del
    // encuadre: en ambos casos no hay pin, pero solo el primero carece
    // también de `ubicacion`.
    dentroDelMapa: boolean;
}

// Radio del pin según cuántos animales aportó. El rango es corto a propósito:
// la diferencia de tamaño tiene que leerse sin convertirse en el dato
// principal — el número exacto está en la leyenda, que es donde se lee bien.
const RADIO_MIN = 5;
const RADIO_MAX = 11;

const P = proyectar(PLANTA);

/** Cuántos píxeles del lienzo mide una barra de escala de 10 km. */
const ESCALA_KM = 10;
const ESCALA_PX = (() => {
    // Se mide sobre el propio lienzo en vez de calcularla con una constante
    // de grados por kilómetro: si algún día cambia el encuadre, la barra se
    // ajusta sola en vez de mentir.
    //
    // El desplazamiento de prueba es de UN grado entero, no una fracción: con
    // 0.1 el resultado salía diez veces corto y la barra decía "10 km"
    // midiendo uno. La proyección es lineal, así que un grado es una medida
    // tan válida como cualquier otra y no hay que dividir por nada después.
    const a = proyectar({ lat: PLANTA.lat, lon: PLANTA.lon });
    const b = proyectar({ lat: PLANTA.lat, lon: PLANTA.lon + 1 });
    const pxPorGrado = b.x - a.x;
    const kmPorGrado = 111.32 * Math.cos((PLANTA.lat * Math.PI) / 180);
    return (ESCALA_KM / kmPorGrado) * pxPorGrado;
})();

/** Miles separados con punto, como se escribe una altitud en Ecuador. */
const metros = (n: number) => n.toLocaleString("es-EC");

/* El halo blanco de las etiquetas. Es lo que permite que el terreno tenga
   contraste de verdad: sin él, cada rótulo habría que apagarlo hasta que
   dejara de competir con el relieve, y entonces el mapa sería bonito y el
   dato ilegible. `paintOrder: stroke` pinta el trazo ANTES que el relleno,
   así que el blanco queda por detrás de la letra y no la engorda. */
const HALO = {
    stroke: "#ffffff",
    strokeWidth: 3,
    strokeLinejoin: "round" as const,
    paintOrder: "stroke" as const,
};

function temperaturaTexto(t: { min: number; max: number }) {
    return t.min === t.max ? `${t.min} °C` : `${t.min}–${t.max} °C`;
}

/** Un dato suelto de la ficha: altitud, temperatura, habitantes. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return (
        <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-gray-400">
                {etiqueta}
            </dt>
            <dd className="text-sm font-semibold text-gray-800 tabular-nums">
                {valor}
            </dd>
        </div>
    );
}

/** El cuerpo de una ficha de comunidad, ya desplegado. */
function Ficha({ ficha, ubicacion }: {
    ficha: Descripcion; ubicacion: Ubicacion | null;
}) {
    return (
        <div className="pb-3 pt-1 space-y-3">
            <p className="text-sm text-gray-600 leading-relaxed">{ficha.texto}</p>

            {/* El origen del nombre va aparte: es lo que convierte un punto
                del mapa en un lugar, y es lo que la gente recuerda. */}
            {ficha.origenNombre && (
                <p className="text-sm text-primary-800 leading-relaxed border-l-2
                        border-oliva-400 pl-3">
                    {ficha.origenNombre}
                </p>
            )}

            <dl className="flex flex-wrap gap-x-8 gap-y-2">
                {ubicacion && (
                    <Dato etiqueta="Altitud" valor={altitudTexto(ubicacion)} />
                )}
                <Dato etiqueta="Temperatura"
                    valor={temperaturaTexto(ficha.temperatura)} />
                {ficha.poblacion !== undefined && (
                    <Dato etiqueta="Habitantes"
                        valor={ficha.poblacion.toLocaleString("es-EC")} />
                )}
            </dl>

            {ubicacion && (
                <a
                    href={enlaceMapa(ubicacion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-semibold text-primary-700
                       underline underline-offset-2 decoration-primary-200
                       hover:decoration-primary-600"
                >
                    Ver la ubicación en el mapa
                    <span aria-hidden="true"> ↗</span>
                </a>
            )}
        </div>
    );
}

/* El galón que abre y cierra una ficha. `<details>` nativo y no un estado de
   React a propósito: funciona sin JavaScript, el teclado y el lector de
   pantalla ya saben usarlo, y el navegador lo encuentra al buscar en la
   página aunque esté plegado. */
function Chevron() {
    return (
        <svg viewBox="0 0 12 12" aria-hidden="true"
            className="w-3 h-3 shrink-0 text-gray-400 transition-transform
                 duration-200 ease-salida group-open:rotate-180">
            <path d="M2 4.5 L6 8.5 L10 4.5" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function MapaOrigen({ aportes }: Props) {
    // Una comunidad sin coordenadas (dada de alta sin ponérselas) o fuera del
    // encuadre horneado no lleva pin. Sigue nombrada en el texto de la
    // ficha: lo que se pierde es el punto en el mapa, no la trazabilidad.
    const ubicados: AporteUbicado[] = aportes
        .map((a) => {
            if (a.latitud === null || a.longitud === null) {
                return { ...a, ubicacion: null, dentroDelMapa: false };
            }
            const coordenada = { lat: a.latitud, lon: a.longitud };
            const ajuste = rotuloDe(a.comunidad);
            // La ubicación se arma SIEMPRE que haya coordenada, caiga o no
            // dentro del encuadre horneado: si se dejara en null para las que
            // caen fuera, la ficha perdía su enlace a Google Maps y su
            // altitud igual que si nunca hubiera tenido coordenadas, que es
            // justo lo que la cabecera de `dentroDelEncuadre` (coordenadas.ts)
            // dice que NO debe pasar.
            const ubicacion: Ubicacion = {
                ...coordenada,
                nombre: ajuste.nombre ?? a.comunidad,
                // El cantón no viaja en el aporte (ComunidadAporteDto no
                // lo lleva): ya se lee arriba, en la cabecera "Origen" de
                // la ficha. Repetirlo aquí por comunidad costaría otro
                // viaje al catálogo por un dato que ya está en pantalla.
                canton: "",
                etiqueta: ajuste,
                msnm: {
                    min: a.altitudMinM ?? 0,
                    max: a.altitudMaxM ?? 0,
                },
            };
            return { ...a, ubicacion, dentroDelMapa: dentroDelEncuadre(coordenada) };
        })
        .sort((a, b) => b.cantidad - a.cantidad);

    // Solo las que de verdad se dibujan en el lienzo: una comunidad fuera del
    // encuadre tiene `ubicacion` (para su ficha) pero no pin, así que ya no
    // basta con mirar `ubicacion !== null` como antes.
    const conPin = ubicados.filter((a) => a.dentroDelMapa) as
        (AporteUbicado & { ubicacion: Ubicacion })[];

    const maxCantidad = Math.max(...conPin.map((a) => a.cantidad), 1);
    const radio = (cantidad: number) =>
        RADIO_MIN + (RADIO_MAX - RADIO_MIN) * (cantidad / maxCantidad);

    const masLejos = conPin.length > 0
        ? Math.max(...conPin.map((a) => kmAPlanta(a.ubicacion))) : null;
    const masAlto = conPin.length > 0
        ? Math.max(...conPin.map((a) => desnivelAPlanta(a.ubicacion))) : null;
    const todasUbicadas = conPin.length === ubicados.length;

    return (
        <section className="bg-blanco rounded-xl border border-gray-200
                        overflow-hidden animate-fade-in-up">
            {/* El filo oliva: en este sistema significa siempre lo mismo,
                "aquí es donde estás". */}
            <div className="filo h-1 w-full" aria-hidden="true" />

            <div className="p-4">
                <h2 className="text-xs font-bold text-primary-700 uppercase
                         tracking-wide mb-3 font-sans">
                    De dónde viene este lote
                </h2>

                {/* ── El mapa ─────────────────────────────────────────── */}
                <div className="rounded-lg overflow-hidden border border-gray-200 mb-1">
                    <svg
                        viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
                        className="w-full h-auto block"
                        role="img"
                        aria-label={
                            conPin.length > 0
                                ? `Mapa del relieve del sur del Azuay. La planta está en `
                                + `${PLANTA.nombre}, a ${metros(msnmMedio(PLANTA))} metros, `
                                + `en el valle. `
                                + conPin.map((a) =>
                                    `${a.ubicacion.nombre}, a ${altitudTexto(a.ubicacion)} `
                                    + `de altitud y ${kmAPlanta(a.ubicacion)} `
                                    + `kilómetros, aportó ${a.cantidad} cuyes`).join(". ")
                                + "."
                                // Sin pines que describir: el mapa dibuja el relieve y la
                                // planta, nada más. Antes decía "con las comunidades de la
                                // cooperativa", frase que era cierta cuando este mapa las
                                // dibujaba siempre como contexto; esa capa se quitó y quien
                                // usa lector de pantalla no debe oír que hay algo que ya no
                                // está dibujado.
                                : `Mapa del relieve del sur del Azuay. La planta está en `
                                + `${PLANTA.nombre}, a ${metros(msnmMedio(PLANTA))} metros, `
                                + "en el valle. Ninguna comunidad de este lote aparece "
                                + "dibujada en el mapa."
                        }
                    >
                        {/* El terreno real. Horneado desde una malla SRTM 30 m
                            y servido como archivo suelto para que el service
                            worker lo cachee y funcione sin señal. */}
                        <image
                            href="/mapa/relieve-azuay.png"
                            x="0" y="0"
                            width={LIENZO.ancho} height={LIENZO.alto}
                            preserveAspectRatio="none"
                        />

                        {/* Curvas de nivel reales. Tenues: dan la lectura de
                            carta topográfica sin taparle el paso a los pines. */}
                        <g fill="none" stroke="#4a5747" strokeOpacity="0.42"
                            strokeWidth="0.6" aria-hidden="true">
                            {CURVAS.map((c) => (
                                <path key={c.nivel} d={c.d} />
                            ))}
                        </g>

                        {/* Los hilos hasta la planta. Rectos porque la distancia
                            que se declara abajo es en línea recta — la carretera
                            de montaña es bastante más larga, y no la conocemos. */}
                        {conPin.map((a) => {
                            const c = proyectar(a.ubicacion);
                            return (
                                <line
                                    key={`hilo-${a.ubicacion.nombre}`}
                                    x1={c.x} y1={c.y} x2={P.x} y2={P.y}
                                    stroke="#ffffff" strokeOpacity="0.75"
                                    strokeWidth="2.5"
                                />
                            );
                        })}
                        {conPin.map((a) => {
                            const c = proyectar(a.ubicacion);
                            return (
                                <line
                                    key={`hilo2-${a.ubicacion.nombre}`}
                                    x1={c.x} y1={c.y} x2={P.x} y2={P.y}
                                    stroke="#004954" strokeWidth="1"
                                    strokeDasharray="3 3"
                                />
                            );
                        })}

                        {/* Las comunidades que sí aportaron */}
                        {conPin.map((a, i) => {
                            const c = proyectar(a.ubicacion);
                            const r = radio(a.cantidad);
                            // El anclaje manual manda sobre la regla automática
                            const ajuste = a.ubicacion.etiqueta;
                            const alaIzquierda = ajuste?.lado
                                ? ajuste.lado === "izq"
                                : c.x > LIENZO.ancho * 0.6;
                            const dy = ajuste?.dy ?? 0;
                            return (
                                <g key={`pin-${a.ubicacion.nombre}`}
                                    className="animate-fade-in"
                                    style={{ animationDelay: `${120 + i * 90}ms` }}>
                                    <circle cx={c.x} cy={c.y} r={r + 2.5}
                                        fill="#ffffff" />
                                    <circle cx={c.x} cy={c.y} r={r}
                                        fill="#005a66" />
                                    <text
                                        x={alaIzquierda ? c.x - r - 5 : c.x + r + 5}
                                        y={c.y - 2 + dy}
                                        textAnchor={alaIzquierda ? "end" : "start"}
                                        className="fill-primary-800 font-semibold"
                                        style={{ fontSize: "11px", ...HALO }}
                                    >
                                        {a.ubicacion.nombre}
                                    </text>
                                    {/* La altitud, pegada al nombre: es el dato
                                        que convierte el mapa en un viaje. */}
                                    <text
                                        x={alaIzquierda ? c.x - r - 5 : c.x + r + 5}
                                        y={c.y + 11 + dy}
                                        textAnchor={alaIzquierda ? "end" : "start"}
                                        className="fill-gray-700"
                                        style={{ fontSize: "9px", ...HALO, strokeWidth: 2.5 }}
                                    >
                                        {altitudTexto(a.ubicacion)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* La planta. Cuadrado y no círculo: no es una comunidad. */}
                        <g className="animate-fade-in"
                            style={{ animationDelay: "80ms" }}>
                            <rect
                                x={P.x - 7.5} y={P.y - 7.5} width="15" height="15"
                                rx="3" fill="#ffffff"
                            />
                            <rect
                                x={P.x - 6} y={P.y - 6} width="12" height="12"
                                rx="2" fill="#4e5400"
                            />
                            <text
                                x={P.x - 11} y={P.y - 3}
                                textAnchor="end"
                                className="fill-gray-800 font-semibold"
                                style={{ fontSize: "10px", ...HALO }}
                            >
                                Planta
                            </text>
                            <text
                                x={P.x - 11} y={P.y + 10}
                                textAnchor="end"
                                className="fill-gray-700"
                                style={{ fontSize: "9px", ...HALO, strokeWidth: 2.5 }}
                            >
                                {altitudTexto(PLANTA)}
                            </text>
                        </g>

                        {/* Barra de escala: convierte el dibujo en un mapa. */}
                        <g aria-hidden="true"
                            transform={`translate(8 ${LIENZO.alto - 10})`}>
                            <line x1="0" y1="0" x2={ESCALA_PX} y2="0"
                                stroke="#ffffff" strokeWidth="3.5" />
                            <line x1="0" y1="0" x2={ESCALA_PX} y2="0"
                                stroke="#374151" strokeWidth="1.5" />
                            <line x1="0" y1="-3" x2="0" y2="3"
                                stroke="#374151" strokeWidth="1.5" />
                            <line x1={ESCALA_PX} y1="-3" x2={ESCALA_PX} y2="3"
                                stroke="#374151" strokeWidth="1.5" />
                            <text x={ESCALA_PX / 2} y="-5" textAnchor="middle"
                                className="fill-gray-700 font-semibold"
                                style={{ fontSize: "9px", ...HALO, strokeWidth: 2.5 }}>
                                {ESCALA_KM} km
                            </text>
                        </g>

                        {/* El norte. Sin él, un relieve sombreado se puede leer
                            girado y las comunidades pierden su sitio real. */}
                        <g aria-hidden="true"
                            transform={`translate(${LIENZO.ancho - 16} 16)`}>
                            <path d="M0,-9 L4,7 L0,3.5 L-4,7 Z"
                                fill="#374151" stroke="#ffffff" strokeWidth="1.5"
                                strokeLinejoin="round" paintOrder="stroke" />
                            <text x="0" y="18" textAnchor="middle"
                                className="fill-gray-700 font-bold"
                                style={{ fontSize: "9px", ...HALO, strokeWidth: 2.5 }}>
                                N
                            </text>
                        </g>
                    </svg>
                </div>

                <p className="text-[10px] text-gray-400 mb-3">
                    Relieve real · SRTM 30 m · curvas cada {metros(CURVAS_INTERVALO)} m
                </p>

                {/* ── Las comunidades ─────────────────────────────────
                    Cada una se abre para leer quién es. Plegadas de inicio:
                    quien solo quiere saber de dónde vino su cuy lo ve en la
                    línea, y quien tiene curiosidad la abre. */}
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {ubicados.map((a) => {
                        const ficha = descripcionDe(a.comunidad);
                        const nombre = a.ubicacion?.nombre ?? a.comunidad;
                        const cabecera = (
                            <>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-gray-900">
                                        {nombre}
                                    </span>
                                    <span className="block text-xs text-gray-500">
                                        {a.ubicacion
                                            ? a.dentroDelMapa
                                                ? <>
                                                    {/* Sin cantón aquí: ComunidadAporteDto no
                                                        lo trae por comunidad, y ya se lee arriba
                                                        en la cabecera "Origen" de la ficha. */}
                                                    {altitudTexto(a.ubicacion)}
                                                    <br />
                                                    {kmAPlanta(a.ubicacion)} km · baja unos{" "}
                                                    <strong className="font-semibold text-gray-700">
                                                        {metros(desnivelAPlanta(a.ubicacion))} m
                                                    </strong>{" "}
                                                    hasta la planta
                                                </>
                                                // Con coordenada pero fuera del encuadre
                                                // horneado (ver dentroDelEncuadre en
                                                // coordenadas.ts): no es que falte el dato,
                                                // es que este mapa en concreto no llega
                                                // hasta ahí. Decir "pendiente de registro"
                                                // sería falso, y el enlace a Google Maps de
                                                // la ficha (más abajo) sigue funcionando.
                                                : <>
                                                    {altitudTexto(a.ubicacion)}
                                                    <br />
                                                    Fuera del área que cubre este mapa
                                                </>
                                            // Nunca se inventa una posición aproximada: en
                                            // una ficha cuya única función es ser creíble,
                                            // un pin inventado cuesta más que un hueco
                                            // declarado.
                                            : "Ubicación pendiente de registro"}
                                    </span>
                                </span>
                                <span className="shrink-0 flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-800
                                     tabular-nums">
                                        {a.cantidad}
                                        <span className="font-medium text-gray-400 text-xs">
                                            {" "}{a.cantidad === 1 ? "cuy" : "cuyes"}
                                        </span>
                                    </span>
                                    {ficha && <Chevron />}
                                </span>
                            </>
                        );

                        return (
                            <li key={a.comunidad}>
                                {ficha ? (
                                    <details className="group">
                                        <summary className="flex items-baseline justify-between
                                       gap-3 py-3 cursor-pointer list-none
                                       [&::-webkit-details-marker]:hidden
                                       hover:bg-gray-50 -mx-1 px-1 rounded">
                                            {cabecera}
                                        </summary>
                                        <Ficha ficha={ficha} ubicacion={a.ubicacion} />
                                    </details>
                                ) : (
                                    <div className="flex items-baseline justify-between
                                     gap-3 py-3">
                                        {cabecera}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {/* La frase solo puede hablar de las comunidades cuya ubicación
                    está registrada. Si el lote trae alguna sin coordenada,
                    decir "ninguna de estas comunidades" afirmaría algo que no
                    se sabe. */}
                {masLejos !== null && masAlto !== null && (
                    <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                        {conPin.length === 1
                            /* Con una comunidad sin ubicar en la lista, "de ahí"
                               no dice de cuál de las dos: hay que nombrarla. */
                            ? <>{todasUbicadas ? "De ahí" : conPin[0].ubicacion.nombre}
                                {todasUbicadas ? " a la planta hay " : " está a "}
                                <strong className="text-gray-700">{masLejos} km</strong>
                                {todasUbicadas ? " y unos " : " de la planta, y baja unos "}
                                <strong className="text-gray-700">
                                    {metros(masAlto)} metros</strong>
                                {todasUbicadas ? " de bajada." : " para llegar."}</>
                            : <>{todasUbicadas ? "Ninguna" : "Ninguna de las comunidades "
                                + "con ubicación registrada"} está a más de{" "}
                                <strong className="text-gray-700">{masLejos} km</strong>{" "}
                                de la planta, y todas bajan hasta{" "}
                                <strong className="text-gray-700">
                                    {metros(masAlto)} metros</strong> para llegar.</>}
                    </p>
                )}
            </div>

            {/* ── El destino ─────────────────────────────────────────
                Cierra el recorrido: dónde termina el viaje que dibuja el
                mapa. El texto es de la cooperativa —su documento de
                comunidades— y no una redacción nuestra: en una ficha cuya
                única función es ser creíble, quien responde por estas frases
                tiene que ser quien las firma. */}
            <div className="bg-primary-50 border-t border-primary-100 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]
                        text-primary-700 mb-1.5">
                    Dónde se faena
                </p>
                <p className="text-sm font-bold text-primary-900 mb-1">
                    {PLANTA.nombre} · {PLANTA.canton} · {altitudTexto(PLANTA)}
                </p>
                <p className="text-sm text-primary-900 leading-relaxed">
                    {FICHA_PLANTA.texto}
                </p>
                <a
                    href={enlaceMapa(PLANTA)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm font-semibold text-primary-700
                       underline underline-offset-2 decoration-primary-300
                       hover:decoration-primary-700"
                >
                    Ver la planta en el mapa
                    <span aria-hidden="true"> ↗</span>
                </a>
            </div>
        </section>
    );
}
