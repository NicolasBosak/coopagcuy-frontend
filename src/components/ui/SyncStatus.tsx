import type { useOfflineSync } from "../../hooks/useOfflineSync";

type Props = ReturnType<typeof useOfflineSync>;

export function SyncStatus({
    isOnline, syncing, pendientes, lastSync, sincronizar
}: Props) {
    // Con registros pendientes y conexión disponible, el botón toma
    // protagonismo: naranja y grande para transmitir la urgencia de
    // sincronizar lo capturado sin conexión.
    if (isOnline && pendientes > 0 && !syncing) {
        return (
            <button
                onClick={() => sincronizar()}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl
                   bg-bayo-500 hover:bg-bayo-600 text-white text-sm
                   font-bold shadow-md shadow-bayo-500/30 transition
                   active:scale-[0.97] animate-fade-in"
            >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                Sincronizar {pendientes} lote{pendientes > 1 ? "s" : ""} ahora
            </button>
        );
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full
                     text-xs font-medium border
                     ${isOnline
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-bayo-50 border-bayo-100 text-bayo-700"}`}>
            <span className={`w-1.5 h-1.5 rounded-full
                        ${syncing
                    ? "bg-bayo-500 animate-pulse"
                    : isOnline
                        ? "bg-green-500"
                        : "bg-bayo-500 animate-pulse"}`} />

            {syncing ? (
                "Sincronizando..."
            ) : isOnline ? (
                lastSync
                    ? `Sincronizado ${lastSync.toLocaleTimeString("es-EC", {
                        hour: "2-digit", minute: "2-digit"
                    })}`
                    : "En línea"
            ) : (
                pendientes > 0
                    ? `Sin señal · ${pendientes} guardado${pendientes > 1 ? "s" : ""} en la tablet`
                    : "Sin señal"
            )}
        </div>
    );
}
