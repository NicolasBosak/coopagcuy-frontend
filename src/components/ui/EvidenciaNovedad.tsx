import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { recepcionApi } from "../../api/recepcion";

interface Props {
    novedadId: number;
    /**
     * Carga la foto al montar, sin esperar a que la toquen.
     *
     * Se activa donde la lista es corta y la evidencia es lo que el operador
     * necesita ver —el asistente de faenamiento, que solo lista los cuyes del
     * lote elegido— y se deja apagado donde la lista es larga, como la tabla
     * de lotes de Recepción: ahí descargar de golpe decenas de fotos que
     * nadie va a mirar no compensa.
     */
    autoCargar?: boolean;
}

const MENSAJE_CADUCADA = "La evidencia ya no está disponible (se borra a los 90 días).";
const MENSAJE_ERROR_CARGA = "No se pudo cargar la evidencia.";

/**
 * Evidencia fotográfica de una novedad clínica.
 *
 * Se descarga por el cliente autenticado y se muestra desde un object URL: el
 * access token vive en memoria y lo pone un interceptor de axios, así que un
 * `<img src>` apuntando al endpoint recibiría 401.
 *
 * La descarga va por React Query y no por un efecto propio: un efecto que
 * dispara la petición tiene que encender el indicador de carga antes de
 * llamar al API, y eso es un setState síncrono dentro del efecto —lo que
 * React desaconseja y la regla react-hooks/set-state-in-effect rechaza. Con
 * `enabled` la petición se pide de forma declarativa y, de paso, dos cuyes
 * con la misma novedad comparten una sola descarga.
 *
 * La evidencia caduca a los 90 días; pasada esa fecha el API responde 404 y
 * aquí se dice, en vez de dejar un hueco sin explicación. Cualquier otro fallo
 * (sin red, 5xx, 401…) se reporta distinto y con reintento: la foto puede
 * seguir existiendo y hace falta para reclamar al proveedor.
 */
export function EvidenciaNovedad({ novedadId, autoCargar = false }: Props) {
    // En modo bajo demanda la consulta nace apagada y la enciende el botón.
    // Encenderla es un manejador de evento, no un efecto.
    const [habilitada, setHabilitada] = useState(autoCargar);

    const { data, isFetching, isError, error, refetch } = useQuery({
        queryKey: ["novedad-foto", novedadId],
        queryFn: () => recepcionApi.fotoNovedad(novedadId),
        enabled: habilitada,
        // La foto no cambia mientras exista, y un 404 por caducidad tampoco se
        // arregla reintentando solo: el reintento lo pide el operador.
        staleTime: Infinity,
        retry: false,
    });

    const url = useMemo(
        () => (data ? URL.createObjectURL(data) : null), [data]);

    // Los object URL no se liberan solos: sin esto, abrir muchas fotos
    // mantiene los blobs vivos hasta recargar la página.
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    const status = (error as { response?: { status?: number } } | null)
        ?.response?.status;
    const caducada = isError && status === 404;

    // Hueco del mismo tamaño que la miniatura: sin esto la lista de cuyes da
    // un salto cuando cada foto termina de bajar.
    if (isFetching) {
        return (
            <div className="w-20 h-20 rounded-xl border-2 border-gray-200 bg-gray-50
                            animate-pulse flex items-center justify-center"
                aria-label="Cargando la evidencia">
                <span className="text-xl opacity-40" aria-hidden="true">📷</span>
            </div>
        );
    }

    if (url) {
        return (
            <a href={url} target="_blank" rel="noreferrer"
                title="Abrir la evidencia en tamaño completo"
                className="inline-block relative rounded-xl overflow-hidden
                           border-2 border-teja-300 shadow-sm">
                <img
                    src={url}
                    alt="Evidencia fotográfica de la novedad clínica"
                    className="w-20 h-20 object-cover block"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white
                                 text-[10px] font-semibold text-center py-0.5">
                    Ampliar
                </span>
            </a>
        );
    }

    // Caducada: no hay nada que reintentar, el blob ya no existe.
    if (caducada) {
        return <span className="text-xs text-gray-400">{MENSAJE_CADUCADA}</span>;
    }

    // Sin foto todavía: falló la carga, o está en modo bajo demanda. En ambos
    // casos un objetivo táctil de verdad (44px), no un texto que parezca parte
    // del aviso — es el estándar del resto de la aplicación en tablet de 7".
    return (
        <button
            type="button"
            onClick={() => {
                if (habilitada) void refetch();
                else setHabilitada(true);
            }}
            title={isError ? MENSAJE_ERROR_CARGA : undefined}
            className="min-h-[44px] px-3 rounded-xl border-2 border-teja-300
                       bg-white text-xs font-bold text-teja-700
                       hover:bg-teja-50 active:scale-95 transition
                       flex items-center gap-2"
        >
            <span className="text-base" aria-hidden="true">📷</span>
            {isError ? "Reintentar foto" : "Ver foto del defecto"}
        </button>
    );
}
