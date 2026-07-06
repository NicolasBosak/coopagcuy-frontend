import { useState, useEffect, useCallback, useRef } from "react";
import { offlineDB } from "../services/db";
import client from "../api/client";
import type { SyncResult } from "../types/recepcion";

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncing, setSyncing] = useState(false);
    const [pendientes, setPendientes] = useState(0);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Evita sincronizaciones simultáneas: el evento "online" puede
    // dispararse varias veces seguidas y dos envíos concurrentes
    // competirían por las mismas entregas
    const syncEnCurso = useRef(false);

    // Contar pendientes al montar
    const actualizarConteo = useCallback(async () => {
        const lotes = await offlineDB.obtenerPendientes();
        setPendientes(lotes.length);
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
                    entregas: entregas.map(({ _id, _tipo, _estado,
                        _fechaCreacion, _intentos, _error, ...rest }) => ({
                            ...rest,
                            idCliente: _id,
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