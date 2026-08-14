// Colores de los gráficos, derivados de la paleta institucional.
//
// Los SVG no pueden usar clases de Tailwind para `stroke`, así que los tonos
// viven aquí en hex — pero salen todos de los tokens de tailwind.config.js y
// este es el único sitio donde se escriben. Si cambia la paleta, cambia aquí.
//
// Todos superan 3:1 contra blanco, que es lo que pide WCAG 2.2 (1.4.11) para
// un objeto gráfico. Por eso el oliva entra en su tono 600 y no en el 400 de
// marca: el #cddd00 sobre blanco da 1.51:1 y un arco fino desaparecería.

/** Serie categórica, en orden de asignación. Los dos cianes van en las
 *  posiciones 1 y 6 para que nunca caigan juntos en un gráfico corto. */
export const PALETA = [
    "#005a66", // primary-600 · cian
    "#f87c56", // bayo-400 · naranja
    "#304f9e", // info-500 · azul
    "#b02a32", // teja-500 · rojo
    "#8d9900", // oliva-600 · verde oliva
    "#4da5af", // primary-300 · cian claro
    "#9ca3af", // gray-400 · resto
];

/** Semáforo de calidad. Mismo significado en todo el sistema. */
export const ACEPTADO = "#005a66";  // primary-600
export const NOVEDAD = "#f87c56";  // bayo-400
export const RECHAZADO = "#b02a32";  // teja-500
export const INFORMATIVO = "#304f9e";  // info-500
export const NEUTRO = "#9ca3af";  // gray-400
/** Lo más grave de una escala: un rojo por debajo del de rechazo. */
export const GRAVE = "#771a21";  // teja-700

/** Canal vacío del anillo */
export const PISTA = "#e5e7eb";     // gray-200
