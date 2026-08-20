import type { ColorPelaje, CuyRegistro } from "../types/recepcion";

// Espejo de Common/ReglasRecepcion.cs del API. Se duplica a propósito: el
// wizard evalúa animales SIN señal, así que las reglas no pueden llegar por
// endpoint. Si cambian allí, cambian aquí — el servidor reevalúa igualmente
// al sincronizar, así que una tablet desactualizada muestra mal pero no
// guarda mal.
export const CAPACIDAD_JAULA = 15;
export const PESO_MINIMO_GRAMOS = 1200;
export const PESO_MAXIMO_GRAMOS = 1500;

// Tope de una entrega individual: dos jaulas completas
export const MAX_ENTREGA = CAPACIDAD_JAULA * 2;

// Tope AGREGADO de evidencia fotográfica por entrega, comprobado en la
// captura (FormLote.tsx), no al sincronizar cuando ya es tarde. El tope de
// 2 MB del servidor es POR FOTO: con MAX_ENTREGA cuyes una sola entrega
// podría sumar decenas de MB, y useOfflineSync manda TODAS las entregas
// pendientes en un único POST que Kestrel corta a los 30 MB por defecto
// (Program.cs no configura MaxRequestBodySize). Si ese POST se pasa, el
// catch del sync solo hace console.error y la tablet deja de poder
// sincronizar nunca más — sin ningún aviso visible, justo el escenario que
// la PWA offline existe para cubrir. 8 MB deja margen bajo el límite de
// Kestrel incluso si ya hay más de una entrega esperando en la cola.
export const MAX_BYTES_EVIDENCIA_ENTREGA = 8 * 1024 * 1024;

// Opciones como tarjetas grandes con pictograma: pensadas para operadoras
// con poca experiencia digital, en tablet de 7"
export const COLORES: { valor: ColorPelaje; icono: string }[] = [
    { valor: "Blanco", icono: "⚪" },
    { valor: "Amarillo", icono: "🟡" },
    { valor: "Rojo", icono: "🔴" },
    { valor: "Combinado", icono: "🟤" },
];

export type NivelCuy = "ok" | "sobrepeso" | "novedad" | "rechazo";

// "sobrepeso" es su propio nivel y no una novedad más: el animal está sano y
// se acepta, solo queda fuera del rango comercial. Mezclarlo con el rechazo
// bajo el mismo color hacía que la operadora leyera "problema" en los dos.
// Un nivel posterior solo sube (ok → sobrepeso → novedad → rechazo).
const ORDEN: NivelCuy[] = ["ok", "sobrepeso", "novedad", "rechazo"];
const subir = (actual: NivelCuy, nuevo: NivelCuy): NivelCuy =>
    ORDEN.indexOf(nuevo) > ORDEN.indexOf(actual) ? nuevo : actual;

// Evaluación local por animal: espejo de EvaluarCuyIndividual del backend.
export function evaluarCuy(c: CuyRegistro): {
    nivel: NivelCuy | null;
    motivos: string[];
} {
    if (c.pesoGramos <= 0) return { nivel: null, motivos: [] };

    const motivos: string[] = [];
    let nivel: NivelCuy = "ok";

    if (c.pesoGramos < PESO_MINIMO_GRAMOS) {
        nivel = subir(nivel, "rechazo");
        motivos.push(`peso bajo el mínimo (${PESO_MINIMO_GRAMOS} g)`);
    } else if (c.pesoGramos > PESO_MAXIMO_GRAMOS) {
        nivel = subir(nivel, "sobrepeso");
        motivos.push(`peso sobre ${PESO_MAXIMO_GRAMOS} g`);
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
