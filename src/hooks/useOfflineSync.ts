import { useState, useEffect, useCallback, useRef } from "react";
import { offlineDB } from "../services/db";
import client from "../api/client";
import type { SyncResult } from "../types/recepcion";
import { omitir } from "../utils/omitir";

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncing, setSyncing] = useState(false);
    const [pendientes, setPendientes] = useState(0);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Evita sincronizaciones simultáneas: el evento "online" puede
    // dispararse varias veces seguidas y dos envíos concurrentes
    // competirían por las mismas entregas
    const syncEnCurso = useRef(false);

    // Contar pendientes al montar. Si IndexedDB no abre (bloqueada, modo
    // privado, cuota agotada) esto ya no debe quedar como una promesa
    // rechazada sin manejar: se registra el error y el contador se queda
    // en su último valor conocido en vez de romper en silencio.
    const actualizarConteo = useCallback(async () => {
        try {
            const lotes = await offlineDB.obtenerPendientes();
            setPendientes(lotes.length);
        } catch (err) {
            console.error("No se pudo leer la cola offline:", err);
        }
    }, []);

    // Sincroniza las entregas pendientes con el backend
    const sincronizar = useCallback(async (): Promise<SyncResult | null> => {
        if (syncEnCurso.current) return null;
        syncEnCurso.current = true;

        try {
            const entregas = await offlineDB.obtenerPendientes();
            if (entregas.length === 0) return null;

            setSyncing(true);
            const dispositivoId = localStorage.getItem("dispositivo_id")
                ?? `dispositivo-${Date.now()}`;
            localStorage.setItem("dispositivo_id", dispositivoId);

            const { data } = await client.post<SyncResult>(
                "/api/recepcion/sync-entregas",
                {
                    dispositivoId,
                    // El _id local viaja como idCliente: es la clave de
                    // idempotencia y de emparejamiento del resultado
                    entregas: entregas.map((e) => ({
                        ...omitir(e, ["_id", "_tipo", "_estado",
                            "_fechaCreacion", "_intentos", "_error"]),
                        idCliente: e._id,
                    })),
                }
            );

            // Emparejar por idCliente, nunca por posición. Una entrega
            // "duplicada" (reintento de algo ya guardado en el servidor)
            // también queda marcada como sincronizada.
            for (const r of data.resultados) {
                if (!r.idCliente) continue;
                if (r.exito) {
                    await offlineDB.marcarSincronizado(r.idCliente);
                } else if (r.pendienteVinculacion) {
                    // Cédula válida sin productora: quedó en la bandeja de
                    // vinculación del admin. Ya no se reenvía desde la tablet.
                    await offlineDB.marcarEnRevision(
                        r.idCliente, r.motivo ?? undefined);
                } else {
                    await offlineDB.marcarError(
                        r.idCliente, r.motivo ?? "Error desconocido");
                }
            }

            setLastSync(new Date());
            await actualizarConteo();
            return data;
        } catch (err) {
            console.error("Error en sincronización:", err);
            return null;
        } finally {
            syncEnCurso.current = false;
            setSyncing(false);
        }
    }, [actualizarConteo]);

    // Escuchar cambios de conectividad
    useEffect(() => {
        const onOnline = async () => {
            setIsOnline(true);
            await sincronizar(); // sincroniza automáticamente al volver online
        };
        const onOffline = () => setIsOnline(false);

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        // Falso positivo de la regla: actualizarConteo() es async y su
        // propio setPendientes ocurre después de un `await
        // offlineDB.obtenerPendientes()` interno (IndexedDB), nunca en el
        // mismo tick que este efecto. La regla no atraviesa el await de una
        // función externa para verlo.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        actualizarConteo();

        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, [sincronizar, actualizarConteo]);

    return {
        isOnline, syncing, pendientes, lastSync,
        sincronizar, actualizarConteo
    };
}