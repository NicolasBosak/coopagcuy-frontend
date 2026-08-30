/**
 * Geometría del mapa de origen: proyección, distancias y la planta.
 *
 * Las COORDENADAS DE LAS COMUNIDADES ya no viven aquí. Subieron al catálogo
 * (Comunidad.Latitud/Longitud/AltitudMinM/AltitudMaxM) el día en que la
 * cooperativa pudo dar de alta comunidades desde Administración, que es
 * exactamente lo que la cabecera anterior de este archivo anticipaba. Llegan
 * dentro de cada aporte de la ficha pública.
 *
 * Lo que SÍ sigue aquí es lo que no es un dato de catálogo: la coordenada de
 * la planta —única y fija—, la proyección al lienzo y las fórmulas de
 * distancia y desnivel.
 *
 * ── El encuadre está CONGELADO ──────────────────────────────────────
 *
 * RANGO_LAT y RANGO_LON son literales y no se recalculan a partir de las
 * comunidades que llegan. El relieve del fondo es una malla SRTM horneada
 * (relieve.generado, producida por scripts/relieve) para este encuadre
 * exacto: si el marco se moviera al aparecer una comunidad lejana, el
 * terreno se quedaría donde estaba y los pines señalarían montañas que no
 * son. Un mapa desincronizado es peor que un pin de menos.
 *
 * Una comunidad cuya coordenada caiga fuera de este marco NO recibe pin. La
 * ficha sigue diciendo su nombre, su cantón, su provincia y su enlace a
 * Google Maps, que se arma desde la coordenada y no depende del encuadre.
 * Para dibujar otra provincia hay que regenerar el relieve con
 * scripts/relieve y actualizar estos dos rangos a la vez.
 */

export interface Coordenada {
    lat: number;
    lon: number;
}

export interface Ubicacion extends Coordenada {
    /** Nombre para mostrar. No siempre es el que trae la base. */
    nombre: string;
    canton: string;
    /**
     * Altitud en metros sobre el nivel del mar, SEGÚN LA COOPERATIVA.
     *
     * Es un rango y no un punto porque una comunidad ocupa una ladera, no
     * una coordenada: Huertas va de 2600 a 2900 m. Cuando la cooperativa da
     * una sola cifra, min y max coinciden.
     *
     * La fuente es su documento de descripción de comunidades, no la malla
     * SRTM que dibuja el terreno. Las dos concuerdan dentro de unos 50 m
     * —SRTM mide 2908 en el punto de Huertas, 3274 en Las Nieves, 1089 en la
     * planta—, pero en pantalla manda la cifra de quien responde por ella.
     *
     * No es un adorno: es el dato que explica el viaje. Vista desde arriba y
     * en plano, una comunidad a 23 km de la planta parece estar al lado.
     */
    msnm: { min: number; max: number };
    /**
     * Ajuste manual de la etiqueta sobre el mapa.
     *
     * La regla automática —el rótulo va a la derecha del pin, salvo en el
     * tercio derecho del lienzo, donde va a la izquierda— resuelve bien casi
     * todo. Pero los puntos del piloto son cinco y fijos, y al ensanchar el
     * encuadre dos quedaron demasiado juntos: El Progreso pisaba la altitud
     * de la planta. Con una geometría que no cambia, colocar esas etiquetas a
     * mano es lo que haría un cartógrafo, y es más fiable que un algoritmo de
     * anticolisión que nadie va a poder depurar.
     *
     * Si se añade una comunidad y no se le pone nada, cae en la regla
     * automática.
     */
    etiqueta?: { lado?: "izq" | "der"; dy?: number };
}

/**
 * El centro de faenamiento. Es el destino de todas las comunidades y el
 * punto donde converge el mapa.
 *
 * RESUELTO: la planta está en Sulupali Chico. El documento de comunidades de
 * la cooperativa lo confirma —"en esta comunidad se encuentra localizada la
 * planta o centro de faenamiento"—, así que el rótulo "Sulupali Chico,
 * Santa Isabel" que ya usaba QRPublico.tsx y esta coordenada son el mismo
 * sitio. Se unifica el nombre aquí para que no vuelvan a divergir.
 */
export const PLANTA: Ubicacion = {
    nombre: "Sulupali Chico",
    canton: "Santa Isabel",
    lat: -3.298639,   // 3°17'55.1"S
    lon: -79.274833,  // 79°16'29.4"W
    msnm: { min: 1141, max: 1141 },   // orillas del río Rircay, valle de Yunguilla
};

/**
 * Normaliza un nombre de comunidad a una clave de búsqueda: minúsculas, sin
 * tildes y sin nada que no sea letra o dígito.
 *
 * No es exceso de celo. El catálogo guarda "Las Nieves" y "Nabón / El
 * Progreso" —con espacios alrededor de la barra—, y el propio API arrastra
 * la cicatriz de cuando la comunidad era texto libre: el comentario de
 * Productora.cs cuenta que "Patacocha" y "Patococha" llegaron a aparecer
 * como dos comunidades distintas en esta misma ficha pública. Comparar
 * cadenas crudas dejaría a una comunidad sin pin por una tilde.
 */
export function clave(nombre: string): string {
    return nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")   // marcas de tilde sueltas
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

/**
 * Retoques de rótulo sobre el mapa, por comunidad.
 *
 * NO subieron al catálogo con las coordenadas, y a propósito: son
 * decisiones de cartografía sobre un encuadre fijo —qué etiqueta se monta
 * sobre cuál—, no hechos sobre dónde está una comunidad. El día que se
 * regenere el relieve habrá que revisarlos; el día que se corrija una
 * latitud en Administración, no.
 *
 * `nombre` está porque la cooperativa llama «El Progreso» a la comunidad
 * que el catálogo guarda como «Nabón / El Progreso»: en la ficha pública va
 * el nombre corto, que es como se nombra a sí misma y cabe en la etiqueta.
 *
 * Una comunidad que no esté aquí cae en la regla automática, que es lo
 * correcto para las que se den de alta desde Administración.
 */
const ROTULOS = new Map<string, { nombre?: string; lado?: "izq" | "der"; dy?: number }>([
    [clave("Las Nieves"), { dy: -4 }],
    [clave("Nabón / El Progreso"), { nombre: "El Progreso", dy: 14 }],
]);

export function rotuloDe(nombreComunidad: string) {
    return ROTULOS.get(clave(nombreComunidad)) ?? {};
}

// ── Distancia ────────────────────────────────────────────────────────

const RADIO_TIERRA_KM = 6371;
const aRadianes = (g: number) => (g * Math.PI) / 180;

/** Distancia en línea recta entre dos puntos, en kilómetros (haversine). */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
    const dLat = aRadianes(b.lat - a.lat);
    const dLon = aRadianes(b.lon - a.lon);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) *
        Math.sin(dLon / 2) ** 2;
    return RADIO_TIERRA_KM * 2 * Math.asin(Math.sqrt(h));
}

/** Kilómetros en línea recta de una comunidad a la planta, redondeados. */
export function kmAPlanta(u: Coordenada): number {
    return Math.round(distanciaKm(u, PLANTA));
}

/** Punto medio del rango de altitud, para las cuentas que piden una cifra. */
export function msnmMedio(u: Ubicacion): number {
    return Math.round((u.msnm.min + u.msnm.max) / 2);
}

/**
 * Metros que se BAJAN desde una comunidad hasta la planta.
 *
 * Es la cifra que hace entender el viaje. Los 23 km de Huertas a la planta
 * suenan a nada hasta que se dice que en esos 23 km se bajan unos 1600 metros
 * por carretera de montaña. Positivo siempre en el piloto: la planta está en
 * el fondo del valle y todas las comunidades por encima.
 *
 * Se calcula sobre el punto medio del rango, y por eso la pantalla lo dice
 * con un "unos": la comunidad ocupa una ladera y no un punto, así que dar la
 * cifra al metro seria fingir una precision que no existe.
 */
export function desnivelAPlanta(u: Ubicacion): number {
    return msnmMedio(u) - msnmMedio(PLANTA);
}

/** "2.600–2.900 m" o "3.190 m" segun la cooperativa dé rango o una cifra. */
export function altitudTexto(u: Ubicacion): string {
    const f = (n: number) => n.toLocaleString("es-EC");
    return u.msnm.min === u.msnm.max
        ? `${f(u.msnm.min)} m`
        : `${f(u.msnm.min)}–${f(u.msnm.max)} m`;
}

// ── Proyección al lienzo del mapa ────────────────────────────────────
//
// Los cinco puntos caben en un rectángulo de unos 33 km de este a oeste por
// 28 de norte a sur, a 3° de latitud. A esa escala y tan cerca del ecuador
// (cos 3.2° = 0.9984) una proyección equirectangular plana —x proporcional a
// la longitud, y proporcional a la latitud invertida— no introduce distorsión
// perceptible. No hace falta ninguna librería de proyección.

/**
 * Cuánto territorio se ve alrededor de las comunidades, como fracción de la
 * distancia que las separa.
 *
 * Empezó en 0.08 —lo justo para que ningún pin tocara el borde— y el mapa
 * salía recortado contra los propios puntos: se veía dónde están las
 * comunidades, no en qué territorio están. A 0.40 se ve casi tres veces más
 * superficie y aparece lo que da sentido al viaje: la cordillera occidental
 * al oeste, el valle del Jubones bajando hacia el suroeste, y el descuelgue
 * hacia la costa que se ve desde Las Nieves.
 *
 * Subirlo más encoge los pines hasta que las etiquetas chocan; bajarlo
 * devuelve el recorte. Si se cambia, hay que regenerar el relieve
 * (ver scripts/relieve/README.md): las curvas de nivel están atadas a esta
 * caja.
 */
const HOLGURA = 0.40;

function rango(valores: number[]) {
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const holgura = (max - min) * HOLGURA;
    return { min: min - holgura, max: max + holgura };
}

/**
 * Las cinco coordenadas que definen el encuadre horneado: las cuatro
 * comunidades del piloto con posición tomada, más la planta.
 *
 * Pelincay no está: nunca se le tomó coordenada, así que tampoco entraba en
 * el cálculo del encuadre de hoy. Meterla ahora con una cifra aproximada
 * movería el marco y desalinearía el relieve.
 *
 * Se quedan aquí como literales, y NO se leen del catálogo, aunque el
 * catálogo ya las tenga. Son la geometría del PNG de relieve, no el dato de
 * dónde está una comunidad: si mañana alguien corrige por 200 metros la
 * coordenada de Huertas en Administración, el mapa de fondo no se
 * reproyecta, y este marco no debe moverse con ella.
 *
 * Solo se tocan a la vez que se regenera el relieve con scripts/relieve.
 */
const ENCUADRE_PILOTO: Coordenada[] = [
    { lat: -3.225944, lon: -79.504472 },  // Patococha
    { lat: -3.083667, lon: -79.451222 },  // Las Nieves
    { lat: -3.135528, lon: -79.395972 },  // Huertas
    { lat: -3.340833, lon: -79.204806 },  // Nabón / El Progreso
    { lat: PLANTA.lat, lon: PLANTA.lon },
];

const RANGO_LAT = rango(ENCUADRE_PILOTO.map((u) => u.lat));
const RANGO_LON = rango(ENCUADRE_PILOTO.map((u) => u.lon));

/** ¿La coordenada cae dentro del encuadre horneado? Ver cabecera. */
export function dentroDelEncuadre(c: Coordenada): boolean {
    return c.lat >= RANGO_LAT.min && c.lat <= RANGO_LAT.max
        && c.lon >= RANGO_LON.min && c.lon <= RANGO_LON.max;
}

/**
 * El lienzo. El ancho es fijo y el alto sale de la forma real del territorio,
 * así que el mapa no deforma la región para caber en una caja bonita.
 */
export const LIENZO = {
    ancho: 320,
    alto: Math.round(
        320 * (RANGO_LAT.max - RANGO_LAT.min) / (RANGO_LON.max - RANGO_LON.min),
    ),
};

/**
 * Coordenada geográfica → punto del SVG.
 *
 * El encuadre es el fijo de ENCUADRE_PILOTO, nunca el de las comunidades que
 * aportaron a un lote concreto. Si el marco se ajustara al subconjunto de
 * cada ficha, el mismo territorio se vería a una escala distinta en cada
 * lote —y encima desalineado del relieve horneado, que es una imagen fija.
 */
export function proyectar(c: Coordenada): { x: number; y: number } {
    return {
        x: (c.lon - RANGO_LON.min) / (RANGO_LON.max - RANGO_LON.min) * LIENZO.ancho,
        y: (RANGO_LAT.max - c.lat) / (RANGO_LAT.max - RANGO_LAT.min) * LIENZO.alto,
    };
}

/**
 * Enlace a la ubicación en Google Maps, armado desde la misma coordenada que
 * dibuja el pin.
 *
 * A propósito NO se usan los enlaces cortos de maps.app.goo.gl: un acortador
 * puede caducar y, sobre todo, sería una segunda fuente de verdad al lado de
 * la coordenada. Armándolo aquí, el pin y el enlace no pueden discrepar.
 */
export function enlaceMapa(c: Coordenada): string {
    return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`;
}
