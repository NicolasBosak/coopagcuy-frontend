import {
    COMUNIDADES_CONOCIDAS, LIENZO, PLANTA, clave, desnivelAPlanta, enlaceMapa,
    kmAPlanta, proyectar, ubicacionDe, type Ubicacion,
} from "../../domain/comunidades/coordenadas";
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
 * el terreno debajo se ve lo que de verdad ocurre: los cuyes bajan del páramo
 * (2663–3274 m) al fondo del valle del Jubones (1089 m), entre 1574 y 2185
 * metros de desnivel por carretera de montaña.
 *
 * Va en SVG con un PNG horneado, no con tiles de un tercero: esta página se
 * escanea en un puesto de venta con datos móviles flojos (por eso los logos
 * de la cabecera ya cargan con fetchPriority alto), la app es una PWA que
 * cachea lo suyo con Workbox y no cachearía tiles ajenos, y la paleta del
 * proveedor se impondría sobre la institucional en la única pantalla que ve
 * el consumidor final. El relieve horneado pesa 19 KB y funciona sin señal.
 */

interface Aporte {
    comunidad: string;
    cantidad: number;
}

interface Props {
    aportes: Aporte[];
}

interface AporteUbicado extends Aporte {
    ubicacion: Ubicacion | null;
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

export function MapaOrigen({ aportes }: Props) {
    const ubicados: AporteUbicado[] = aportes
        .map((a) => ({ ...a, ubicacion: ubicacionDe(a.comunidad) }))
        .sort((a, b) => b.cantidad - a.cantidad);

    const conPin = ubicados.filter((a) => a.ubicacion !== null) as
        (AporteUbicado & { ubicacion: Ubicacion })[];

    // Las comunidades de la cooperativa que NO aportaron a este lote.
    const aportantes = new Set(conPin.map((a) => clave(a.ubicacion.nombre)));
    const contexto = COMUNIDADES_CONOCIDAS
        .filter((u) => !aportantes.has(clave(u.nombre)));

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
                                ? `Mapa del relieve del sur del Azuay. La planta está a `
                                + `${metros(PLANTA.msnm)} metros, en el valle. `
                                + conPin.map((a) =>
                                    `${a.ubicacion.nombre}, a ${metros(a.ubicacion.msnm)} `
                                    + `metros de altitud y ${kmAPlanta(a.ubicacion)} `
                                    + `kilómetros, aportó ${a.cantidad} cuyes`).join(". ")
                                + "."
                                : "Mapa del relieve del sur del Azuay con las comunidades "
                                + "de la cooperativa."
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

                        {/* Curvas de nivel reales. Muy tenues: dan la lectura de
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

                        {/* Comunidades de la cooperativa que no aportaron aquí */}
                        {contexto.map((u) => {
                            const c = proyectar(u);
                            const alaIzquierda = c.x > LIENZO.ancho * 0.6;
                            return (
                                <g key={`ctx-${u.nombre}`} className="animate-fade-in">
                                    <circle cx={c.x} cy={c.y} r="3.5"
                                        fill="#ffffff" stroke="#6b7280" strokeWidth="1.5" />
                                    <text
                                        x={alaIzquierda ? c.x - 7 : c.x + 7}
                                        y={c.y + 3.5}
                                        textAnchor={alaIzquierda ? "end" : "start"}
                                        className="fill-gray-500"
                                        style={{ fontSize: "9px", ...HALO, strokeWidth: 2.5 }}
                                    >
                                        {u.nombre}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Las comunidades que sí aportaron */}
                        {conPin.map((a, i) => {
                            const c = proyectar(a.ubicacion);
                            const r = radio(a.cantidad);
                            const alaIzquierda = c.x > LIENZO.ancho * 0.6;
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
                                        y={c.y - 2}
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
                                        y={c.y + 11}
                                        textAnchor={alaIzquierda ? "end" : "start"}
                                        className="fill-gray-700"
                                        style={{ fontSize: "9px", ...HALO, strokeWidth: 2.5 }}
                                    >
                                        {metros(a.ubicacion.msnm)} m
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
                                {metros(PLANTA.msnm)} m
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

                {/* ── La leyenda ──────────────────────────────────────── */}
                <ul className="divide-y divide-gray-100">
                    {ubicados.map((a) => (
                        <li key={a.comunidad}
                            className="flex items-baseline justify-between gap-3 py-2.5">
                            <span className="min-w-0">
                                {a.ubicacion ? (
                                    <a
                                        href={enlaceMapa(a.ubicacion)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-semibold text-primary-700
                               underline underline-offset-2 decoration-primary-200
                               hover:decoration-primary-600"
                                    >
                                        {a.ubicacion.nombre}
                                        <span className="text-primary-400" aria-hidden="true">
                                            {" "}↗
                                        </span>
                                        <span className="sr-only"> (abre en Google Maps)</span>
                                    </a>
                                ) : (
                                    <span className="text-sm font-semibold text-gray-800">
                                        {a.comunidad}
                                    </span>
                                )}
                                <span className="block text-xs text-gray-500">
                                    {a.ubicacion
                                        ? <>
                                            {a.ubicacion.canton} · {metros(a.ubicacion.msnm)} m
                                            <br />
                                            {kmAPlanta(a.ubicacion)} km · baja{" "}
                                            <strong className="font-semibold text-gray-700">
                                                {metros(desnivelAPlanta(a.ubicacion))} m
                                            </strong>{" "}
                                            hasta la planta
                                        </>
                                        // Nunca se inventa una posición aproximada: en una
                                        // ficha cuya única función es ser creíble, un pin
                                        // inventado cuesta más que un hueco declarado.
                                        : "Ubicación pendiente de registro"}
                                </span>
                            </span>
                            <span className="shrink-0 text-sm font-bold text-gray-800
                             tabular-nums">
                                {a.cantidad}
                                <span className="font-medium text-gray-400 text-xs">
                                    {" "}{a.cantidad === 1 ? "cuy" : "cuyes"}
                                </span>
                            </span>
                        </li>
                    ))}
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
                                {todasUbicadas ? " y " : " de la planta, y baja "}
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

            {/* ── El contexto ─────────────────────────────────────────
                Va aparte y rotulado a propósito. Todo lo de arriba es el
                registro del lote y medida del terreno. Esto de aquí es lo que
                cuenta la cooperativa sobre su región, y no lo verifica ningún
                control. Mezclarlos le prestaría duda a los datos, que es lo
                único que esta pantalla tiene para ofrecer. */}
            <div className="bg-primary-50 border-t border-primary-100 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]
                        text-primary-700 mb-1.5">
                    Sobre la crianza
                </p>
                <p className="text-sm text-primary-900 leading-relaxed">
                    En Nabón, Pucará y Santa Isabel la crianza de cuyes viene de
                    mucho antes de esta cooperativa: se hace en la casa, en galpones
                    familiares, con pasto y forraje del mismo terreno. COOPAGCUY
                    reúne a esas familias y registra cada lote desde que sale de la
                    comunidad. Lo que ves arriba es ese registro.
                </p>
            </div>
        </section>
    );
}
