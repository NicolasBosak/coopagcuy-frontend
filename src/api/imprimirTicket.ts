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
 */
export async function imprimirTicket(pagoId: number): Promise<void> {
    const blob = await pagosApi.descargarTicket(pagoId);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
