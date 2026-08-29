/**
 * Qué es cada comunidad, contado por la cooperativa.
 *
 * TEXTO INSTITUCIONAL DE COOPAGCUY. Sale del documento "Descripción de los
 * lugares donde se encuentran los productores/as de cuyes de la Cooperativa
 * de Producción Ganadera de Cuyes de Pucará y Santa Isabel COOPAGCUY y sus
 * respectivos centros de acopio temporales".
 *
 * No se reescribe ni se adorna: es la voz de la cooperativa sobre su propio
 * territorio, y en una ficha pública cuya única función es ser creíble, quien
 * responde por estas frases tiene que ser quien las firma. Si hay que
 * cambiarlas, se cambian en el documento y luego aquí.
 *
 * Se indexa por la misma clave normalizada que `coordenadas.ts`, así que
 * "Las Nieves", "Nieves" y "LAS NIEVES" llevan todas a la misma ficha.
 */
import { clave } from "./coordenadas";

export interface Descripcion {
    /** Cantón, y parroquia cuando la cooperativa la precisa. */
    parroquia?: string;
    /** Habitantes, según el documento de la cooperativa. */
    poblacion?: number;
    /** Temperatura habitual en grados centígrados. */
    temperatura: { min: number; max: number };
    /** El párrafo, tal como lo escribió la cooperativa. */
    texto: string;
    /**
     * De dónde viene el nombre. Se separa del párrafo a propósito: es lo que
     * la gente recuerda y lo que convierte un punto en un lugar.
     */
    origenNombre?: string;
}

const FICHAS: { alias: string[]; ficha: Descripcion }[] = [
    {
        alias: ["huertas"],
        ficha: {
            parroquia: "Shaglli",
            poblacion: 372,
            temperatura: { min: 16, max: 16 },
            texto:
                "Comunidad ubicada en las estribaciones de la cordillera de los "
                + "Andes, perteneciente a la parroquia Shaglli, cantón Santa "
                + "Isabel. Pertenece a la microcuenca del río San Francisco, de "
                + "la cuenca del Jubones. Sus recursos naturales y paisaje se "
                + "caracterizan por montañas, laderas, fuentes de agua "
                + "cristalinas y áreas de pastoreo naturales.",
            origenNombre:
                "Su nombre viene de un árbol llamado cascarilla: "
                + "«la huerta de cascarillas».",
        },
    },
    {
        alias: ["patococha", "patacocha"],
        ficha: {
            poblacion: 266,
            temperatura: { min: 12, max: 15 },
            texto:
                "Comunidad ubicada en las estribaciones de la cordillera de los "
                + "Andes, en el cantón Pucará, con clima frío de montaña. Sus "
                + "recursos naturales y paisaje se caracterizan por montañas, "
                + "laderas, áreas de pastoreo y fuentes de agua cristalinas.",
            origenNombre:
                "Su nombre viene de pato-cocha. Cuenta la leyenda que había una "
                + "laguna extensa —cocha, en quichua— donde venían patos a nadar.",
        },
    },
    {
        alias: ["las nieves", "nieves"],
        ficha: {
            poblacion: 98,
            temperatura: { min: 11, max: 13 },
            texto:
                "Comunidad ubicada en las estribaciones de la cordillera "
                + "occidental de los Andes, en el cantón Pucará. Sus recursos "
                + "naturales se caracterizan por montañas espectaculares con "
                + "vista hacia la costa ecuatoriana, laderas, áreas de pastoreo "
                + "y fuentes de agua cristalinas.",
            origenNombre:
                "Su nombre se debe a que está rodeada de nubes que parecen "
                + "copos de nieve.",
        },
    },
    {
        alias: ["nabon / el progreso", "nabon/el progreso", "el progreso"],
        ficha: {
            parroquia: "El Progreso",
            poblacion: 421,
            temperatura: { min: 12, max: 16 },
            texto:
                "Comunidad ubicada en la parroquia de su mismo nombre, El "
                + "Progreso, cantón Nabón. Sus recursos naturales y paisajismo "
                + "se caracterizan por sus montañas verdes, áreas de pastoreo y "
                + "un paisaje rural andino.",
            origenNombre:
                "Antiguamente se llamó Santa Rosa de Zhota y perteneció a una "
                + "gran hacienda llamada Susudel.",
        },
    },
];

const POR_CLAVE = new Map<string, Descripcion>(
    FICHAS.flatMap(({ alias, ficha }) =>
        alias.map((a) => [clave(a), ficha] as const)),
);

/** La ficha de una comunidad, o null si todavía no se ha escrito. */
export function descripcionDe(nombreComunidad: string): Descripcion | null {
    return POR_CLAVE.get(clave(nombreComunidad)) ?? null;
}

/**
 * La planta. No es una comunidad que aporta cuyes, así que va aparte: se
 * muestra una sola vez, al final del recorrido, y no en la lista de aportes.
 */
export const FICHA_PLANTA: Descripcion = {
    poblacion: undefined,
    temperatura: { min: 18, max: 21 },
    texto:
        "La planta está en Sulupali Chico, cantón Santa Isabel, a orillas del "
        + "río Rircay, en el valle de Yunguilla. Ahí se faena, se empaca y se "
        + "comercializa el cuy de la marca Cuy Azuayito, cumpliendo la "
        + "normativa de Agrocalidad, la agencia que supervisa los centros de "
        + "faenamiento en el Ecuador, y con buenas prácticas de manufactura. "
        + "La alimentación de los animales está estandarizada a base de pasto "
        + "natural y proteína vegetal.",
};
