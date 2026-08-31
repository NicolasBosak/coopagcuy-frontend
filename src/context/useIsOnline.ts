import { useContext } from "react";
import { ConectividadContext } from "./ConectividadContextInstance";

/**
 * Estado de conectividad reactivo, provisto por `MainLayout` (que ya lo
 * necesita para el indicador de la cabecera).
 *
 * Existe para que ninguna pantalla bajo `MainLayout` tenga que abrir su
 * propio listener de `online`/`offline` — ni, peor, leer `navigator.onLine`
 * directamente en el render, que no es reactivo: el componente no se
 * volvería a pintar solo porque la conexión cambió, y el aviso de "sin
 * conexión" se quedaría congelado con el valor que tenía al montarse.
 *
 * (La cola offline de Recepción usa su propio `useOfflineSync`, con su
 * propio listener: ese hook hace bastante más que rastrear conectividad
 * —guarda la cola en IndexedDB y dispara la sincronización— y separarlo de
 * este contexto evita atarlo a los formularios de Administración.)
 */
export function useIsOnline() {
    return useContext(ConectividadContext);
}
