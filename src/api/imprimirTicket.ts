import { pagosApi } from "./pagos";

/**
 * Descarga el ticket y lo abre para imprimir.
 *
 * Va por el cliente autenticado y no por un enlace directo: el access token
 * vive en memoria y lo pone un interceptor, así que un `<a href>` al endpoint
 * recibiría 401.
 *
 * El object URL se revoca tras un minuto y no de inmediato: revocarlo al
 * instante cierra la pestaña recién abierta antes de que el navegador termine
 * de renderizar el PDF.
 *
 * `window.open` no lanza si el navegador bloquea la ventana emergente:
 * devuelve `null` en silencio. Este caso llega después de dos llamadas de
 * red encadenadas (registrar el pago y descargar el ticket), lo que suele
 * caer fuera de la ventana de activación del navegador y hace el bloqueo
 * más probable. Por eso se trata como un fallo explícito: quien llama
 * necesita enterarse de que el ticket no se imprimió.
 */
export async function imprimirTicket(pagoId: number): Promise<void> {
    const blob = await pagosApi.descargarTicket(pagoId);
    const url = URL.createObjectURL(blob);
    const ventana = window.open(url, "_blank", "noopener");
    if (!ventana) {
        // No hay pestaña que proteger: se revoca ya mismo en vez de
        // esperar el minuto, para no dejar el blob vivo sin motivo.
        URL.revokeObjectURL(url);
        throw new Error("No se pudo abrir la ventana de impresión (bloqueada por el navegador).");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
