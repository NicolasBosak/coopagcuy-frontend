/**
 * Dónde queda cada comunidad de la cooperativa, y dónde la planta.
 *
 * Vive en el front y no en la base de datos a propósito: en el piloto las
 * comunidades son cinco y llegan sembradas por migración
 * (AppDbContext.cs — HasData de Comunidad), así que darles latitud y longitud
 * en el modelo costaría una migración, un cambio de contrato de API y una
 * actualización del SRS a cambio de nada que el consumidor note. Si algún día
 * la cooperativa empieza a dar de alta comunidades nuevas desde
 * Administración, este archivo deja de alcanzar y las coordenadas tienen que
 * subir al catálogo.
 *
 * Único lugar donde se escribe una coordenada. El pin del mapa y el enlace a
 * Google Maps salen los dos de aquí: si estuvieran en dos sitios, un día
 * apuntarían a lugares distintos y nadie lo notaría.
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
     * Altitud en metros sobre el nivel del mar, de la malla SRTM 30 m.
     *
     * No es un adorno: es el dato que explica el viaje. Vista desde arriba
     * y en plano, una comunidad a 23 km de la planta parece estar al lado.
     * Con la altitud se ve lo que de verdad pasa — los cuyes bajan del
     * paramo, entre 2663 y 3274 m, al valle del Jubones a 1089 m.
     */
    msnm: number;
}

/**
 * Centro de Faenamiento de Cuyes. Es el destino de todas las comunidades y
 * el punto donde converge el mapa.
 *
 * PENDIENTE: QRPublico.tsx rotula hoy la planta como "Sulupali Chico,
 * Santa Isabel" en el eslabón de faenamiento. Falta confirmar con la
 * cooperativa si es el mismo sitio que esta coordenada; mientras tanto los
 * dos textos conviven y este es el que manda en el mapa.
 */
export const PLANTA: Ubicacion = {
    nombre: "Centro de Faenamiento de Cuyes",
    canton: "Santa Isabel",
    lat: -3.298639,   // 3°17'55.1"S
    lon: -79.274833,  // 79°16'29.4"W
    msnm: 1089,       // fondo del valle del Jubones
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
 * Las comunidades con ubicación conocida, indexadas por todas las formas en
 * que se las ha escrito.
 *
 * Los alias no son adorno: "lasnieves" es lo que guarda el catálogo y
 * "nieves" es como la nombra la cooperativa de viva voz; "patacocha" es el
 * error de escritura documentado en el API. Cualquiera de las tres tiene que
 * llevar al mismo pin.
 */
const UBICACIONES: { alias: string[]; ubicacion: Ubicacion }[] = [
    {
        alias: ["las nieves", "nieves"],
        ubicacion: {
            nombre: "Las Nieves", canton: "Nabón",
            lat: -3.083667,   // 3°05'01.2"S
            lon: -79.451222,  // 79°27'04.4"W
            msnm: 3274,
        },
    },
    {
        alias: ["huertas"],
        ubicacion: {
            nombre: "Huertas", canton: "Santa Isabel",
            lat: -3.135528,   // 3°08'07.9"S
            lon: -79.395972,  // 79°23'45.5"W
            msnm: 2908,
        },
    },
    {
        alias: ["patococha", "patacocha"],
        ubicacion: {
            nombre: "Patococha", canton: "Pucará",
            lat: -3.225944,   // 3°13'33.4"S
            lon: -79.504472,  // 79°30'16.1"W
            msnm: 3142,
        },
    },
    {
        alias: ["nabon / el progreso", "nabon/el progreso", "el progreso"],
        ubicacion: {
            nombre: "Nabón / El Progreso", canton: "Nabón",
            lat: -3.340833,   // 3°20'27.0"S
            lon: -79.204806,  // 79°12'17.3"W
            msnm: 2663,
        },
    },
    // Falta Pelincay (cantón Pucará, CAT PEL). Es la quinta comunidad
    // sembrada y todavía no tiene coordenada tomada. Deliberadamente NO se
    // pone una posición aproximada: en una pantalla cuya única función es
    // ser creíble, un pin inventado cuesta más que un hueco declarado.
    // `ubicacionDe` devuelve null y el mapa la muestra sin pin, con su
    // nombre y su cantidad intactos.
];

const POR_CLAVE = new Map<string, Ubicacion>(
    UBICACIONES.flatMap(({ alias, ubicacion }) =>
        alias.map((a) => [clave(a), ubicacion] as const)),
);

/** La ubicación de una comunidad, o null si todavía no se ha registrado. */
export function ubicacionDe(nombreComunidad: string): Ubicacion | null {
    return POR_CLAVE.get(clave(nombreComunidad)) ?? null;
}

/** Todas las comunidades con ubicación conocida, de norte a sur. */
export const COMUNIDADES_CONOCIDAS: Ubicacion[] = UBICACIONES
    .map((u) => u.ubicacion)
    .sort((a, b) => b.lat - a.lat);

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

/**
 * Metros que se BAJAN desde una comunidad hasta la planta.
 *
 * Es la cifra que hace entender el viaje. Los 23 km de Huertas a la planta
 * suenan a nada hasta que se dice que en esos 23 km se bajan 1819 metros por
 * carretera de montaña. Positivo siempre en el piloto: la planta está en el
 * fondo del valle y todas las comunidades por encima.
 */
export function desnivelAPlanta(u: Ubicacion): number {
    return u.msnm - PLANTA.msnm;
}

// ── Proyección al lienzo del mapa ────────────────────────────────────
//
// Los cinco puntos caben en un rectángulo de unos 33 km de este a oeste por
// 28 de norte a sur, a 3° de latitud. A esa escala y tan cerca del ecuador
// (cos 3.2° = 0.9984) una proyección equirectangular plana —x proporcional a
// la longitud, y proporcional a la latitud invertida— no introduce distorsión
// perceptible. No hace falta ninguna librería de proyección.

/** Margen alrededor de los puntos, para que ninguno toque el borde. */
const HOLGURA = 0.08;

const TODOS = [...COMUNIDADES_CONOCIDAS, PLANTA];

function rango(valores: number[]) {
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const holgura = (max - min) * HOLGURA;
    return { min: min - holgura, max: max + holgura };
}

const RANGO_LAT = rango(TODOS.map((u) => u.lat));
const RANGO_LON = rango(TODOS.map((u) => u.lon));

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
 * El encuadre se calcula sobre TODAS las comunidades conocidas, nunca sobre
 * las que aportaron a un lote concreto. Si el marco se ajustara al subconjunto,
 * el mismo territorio se vería a una escala distinta en cada lote y dos fichas
 * públicas seguidas mostrarían mapas incomparables entre sí.
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
