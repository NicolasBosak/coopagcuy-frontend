import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface Props {
    /** Clave de React Query. Dos vistas de la misma imagen la comparten. */
    claveCache: unknown[];
    descargar: () => Promise<Blob>;
    /**
     * Carga al montar, sin esperar a que la toquen. Se activa donde la lista
     * es corta y la imagen es lo que hay que ver; se deja apagado donde la
     * lista es larga y descargar de golpe decenas de imágenes que nadie va a
     * mirar no compensa.
     */
    autoCargar?: boolean;
    textoBoton: string;
    /** Qué decir cuando el servidor responde 404 porque ya se borró. */
    textoCaducada: string;
    textoAlternativo: string;
}

/**
 * Imagen que vive detrás de un endpoint autenticado.
 *
 * Se descarga por el cliente autenticado y se muestra desde un object URL: el
 * access token vive en memoria y lo pone un interceptor de axios, así que un
 * `<img src>` apuntando al endpoint recibiría 401.
 *
 * La descarga va por React Query y no por un efecto propio: un efecto que
 * dispara la petición tiene que encender el indicador de carga antes de
 * llamar al API, y eso es un setState síncrono dentro de un efecto —lo que
 * React desaconseja y la regla react-hooks/set-state-in-effect rechaza.
 */
export function ImagenProtegida({
    claveCache, descargar, autoCargar = false,
    textoBoton, textoCaducada, textoAlternativo,
}: Props) {
    // En modo bajo demanda la consulta nace apagada y la enciende el botón.
    // Encenderla es un manejador de evento, no un efecto.
    const [habilitada, setHabilitada] = useState(autoCargar);

    const { data, isFetching, isError, error, refetch } = useQuery({
        queryKey: claveCache,
        queryFn: descargar,
        enabled: habilitada,
        // La imagen no cambia mientras exista, y un 404 por caducidad no se
        // arregla reintentando solo: el reintento lo pide el operador.
        staleTime: Infinity,
        retry: false,
    });

    const url = useMemo(
        () => (data ? URL.createObjectURL(data) : null), [data]);

    // Los object URL no se liberan solos: sin esto, abrir muchas imágenes
    // mantiene los blobs vivos hasta recargar la página.
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    const status = (error as { response?: { status?: number } } | null)
        ?.response?.status;
    const caducada = isError && status === 404;

    // Hueco del mismo tamaño que la miniatura: sin esto la lista da un salto
    // cuando cada imagen termina de bajar.
    if (isFetching) {
        return (
            <div className="w-20 h-20 rounded-xl border-2 border-gray-200 bg-gray-50
                            animate-pulse flex items-center justify-center"
                aria-label="Cargando la imagen">
                <span className="text-xl opacity-40" aria-hidden="true">📷</span>
            </div>
        );
    }

    if (url) {
        return (
            <a href={url} target="_blank" rel="noreferrer"
                title="Abrir en tamaño completo"
                className="inline-block relative rounded-xl overflow-hidden
                           border-2 border-teja-300 shadow-sm">
                <img src={url} alt={textoAlternativo}
                    className="w-20 h-20 object-cover block" />
                <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white
                                 text-[10px] font-semibold text-center py-0.5">
                    Ampliar
                </span>
            </a>
        );
    }

    // Caducada: no hay nada que reintentar, el blob ya no existe.
    if (caducada) {
        return <span className="text-xs text-gray-400">{textoCaducada}</span>;
    }

    // Objetivo táctil de verdad (44px), no un texto que parezca parte del
    // aviso — es el estándar del resto de la aplicación en tablet de 7".
    return (
        <button
            type="button"
            onClick={() => {
                if (habilitada) void refetch();
                else setHabilitada(true);
            }}
            className="min-h-[44px] px-3 rounded-xl border-2 border-teja-300
                       bg-white text-xs font-bold text-teja-700
                       hover:bg-teja-50 active:scale-95 transition
                       flex items-center gap-2"
        >
            <span className="text-base" aria-hidden="true">📷</span>
            {isError ? "Reintentar" : textoBoton}
        </button>
    );
}
