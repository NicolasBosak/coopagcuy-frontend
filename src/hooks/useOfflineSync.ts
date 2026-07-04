import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/db";
import client from "../api/client";
import type { SyncResult } from "../types/recepcion";

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncing, setSyncing] = useState(false);
    const [pendientes, setPendientes] = useState(0);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Contar pendientes al montar
    const actualizarConteo = useCallback(async () => {
        const lotes = await offlineDB.obtenerPendientes();
        setPendientes(lotes.length);
    }, []);

    // Sincroniza las entregas pendientes con el backend
    const sincronizar = useCallback(async (): Promise<SyncResult | null> => {
        const entregas = await offlineDB.obtenerPendientes();
        if (entregas.length === 0) return null;

        setSyncing(true);
        try {
            const dispositivoId = localStorage.getItem("dispositivo_id")
                ?? `dispositivo-${Date.now()}`;
            localStorage.setItem("dispositivo_id", dispositivoId);

            const { data } = await client.post<SyncResult>(
                "/api/recepcion/sync-entregas",
                {
                    dispositivoId,
                    entregas: entregas.map(({ _id, _tipo, _estado,
                        _fechaCreacion, _intentos, _error, ...rest }) => rest),
                }
            );

            for (let i = 0; i < entregas.length; i++) {
                const err = data.errores[i];
                if (err) await offlineDB.marcarError(entregas[i]._id, err.motivo);
                else await offlineDB.marcarSincronizado(entregas[i]._id);
            }

            setLastSync(new Date());
            await actualizarConteo();
            return data;
        } catch (err) {
            console.error("Error en sincronización:", err);
            return null;
        } finally {
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