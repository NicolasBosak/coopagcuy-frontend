import { useCallback, useEffect, useRef, useState } from "react";
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
 * La evidencia caduca a los 90 días; pasada esa fecha el API responde 404 y
 * aquí se dice, en vez de dejar un hueco sin explicación. Cualquier otro fallo
 * (sin red, 5xx, 401…) se reporta distinto y con reintento: la foto puede
 * seguir existiendo y hace falta para reclamar al proveedor.
 */
export function EvidenciaNovedad({ novedadId, autoCargar = false }: Props) {
    const [url, setUrl] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [caducada, setCaducada] = useState(false);

    // Los object URL no se liberan solos: sin esto, abrir muchas fotos
    // mantiene los blobs vivos hasta recargar la página.
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    // Sigue montado: si el componente se desmonta con la descarga en vuelo
    // (el operador cambia de paso o de pantalla), el blob que llegue después
    // no debe generar un object URL huérfano ni un setState perdido.
    // Se pone a true al montar y no solo en el valor inicial: StrictMode
    // monta, desmonta y vuelve a montar en desarrollo, así que sin esta
    // línea la bandera quedaría en false para siempre tras el primer ciclo
    // y la foto no se mostraría nunca al probar con `pnpm dev`.
    const montadoRef = useRef(true);
    useEffect(() => {
        montadoRef.current = true;
        return () => { montadoRef.current = false; };
    }, []);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const blob = await recepcionApi.fotoNovedad(novedadId);
            if (!montadoRef.current) return;
            setUrl(URL.createObjectURL(blob));
        } catch (e: unknown) {
            if (!montadoRef.current) return;
            const status = (e as { response?: { status?: number } } | null)
                ?.response?.status;
            setCaducada(status === 404);
            setError(status === 404 ? MENSAJE_CADUCADA : MENSAJE_ERROR_CARGA);
        } finally {
            if (montadoRef.current) setCargando(false);
        }
    }, [novedadId]);

    useEffect(() => {
        if (autoCargar) void cargar();
    }, [autoCargar, cargar]);

    // Hueco del mismo tamaño que la miniatura: sin esto la lista de cuyes da
    // un salto cuando cada foto termina de bajar.
    if (cargando) {
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
        return <span className="text-xs text-gray-400">{error}</span>;
    }

    // Sin foto todavía: falló la carga, o está en modo bajo demanda. En ambos
    // casos un objetivo táctil de verdad (44px), no un texto que parezca parte
    // del aviso — es el estándar del resto de la aplicación en tablet de 7".
    return (
        <button
            type="button"
            onClick={() => void cargar()}
            className="min-h-[44px] px-3 rounded-xl border-2 border-teja-300
                       bg-white text-xs font-bold text-teja-700
                       hover:bg-teja-50 active:scale-95 transition
                       flex items-center gap-2"
        >
            <span className="text-base" aria-hidden="true">📷</span>
            {error ? "Reintentar foto" : "Ver foto del defecto"}
        </button>
    );
}
