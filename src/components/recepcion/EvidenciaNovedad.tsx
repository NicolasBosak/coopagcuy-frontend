import { useEffect, useRef, useState } from "react";
import { recepcionApi } from "../../api/recepcion";

interface Props {
    novedadId: number;
}

const MENSAJE_CADUCADA = "La evidencia ya no está disponible (se borra a los 90 días).";
const MENSAJE_ERROR_CARGA = "No se pudo cargar la evidencia. Puede ser un problema de conexión: intenta de nuevo más tarde.";

/**
 * Miniatura de la evidencia de una novedad clínica. La foto se pide solo al
 * tocar el botón: la tabla de lotes puede tener decenas de filas y no tiene
 * sentido descargar imágenes que nadie va a mirar.
 *
 * La evidencia caduca a los 90 días; pasada esa fecha el API responde 404 y
 * aquí se dice, en vez de dejar un hueco sin explicación. Cualquier otro
 * fallo (sin red, 5xx, 401…) se reporta distinto: la foto puede seguir
 * existiendo y la operadora la necesita para reclamar al proveedor.
 */
export function EvidenciaNovedad({ novedadId }: Props) {
    const [url, setUrl] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Los object URL no se liberan solos: sin esto, abrir muchas fotos
    // mantiene los blobs vivos hasta recargar la página.
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

    // Sigue montado: si el componente se desmonta con la descarga en vuelo
    // (la operadora filtra la tabla o cambia de pantalla), el blob que llegue
    // después no debe generar un object URL huérfano ni un setState perdido.
    // Se pone a true al montar y no solo en el valor inicial: StrictMode
    // monta, desmonta y vuelve a montar en desarrollo, así que sin esta
    // línea la bandera quedaría en false para siempre tras el primer ciclo
    // y la foto no se mostraría nunca al probar con `pnpm dev`.
    const montadoRef = useRef(true);
    useEffect(() => {
        montadoRef.current = true;
        return () => { montadoRef.current = false; };
    }, []);

    const abrir = async () => {
        if (url) return;
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
            setError(status === 404 ? MENSAJE_CADUCADA : MENSAJE_ERROR_CARGA);
        } finally {
            if (montadoRef.current) setCargando(false);
        }
    };

    if (error) return <span className="text-xs text-gray-400">{error}</span>;

    if (url) {
        return (
            <a href={url} target="_blank" rel="noreferrer"
                title="Abrir la evidencia en tamaño completo">
                <img
                    src={url}
                    alt="Evidencia de la novedad clínica"
                    className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                />
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={abrir}
            disabled={cargando}
            className="text-xs font-semibold text-primary-700 hover:text-primary-600
                       disabled:opacity-50"
        >
            {cargando ? "Cargando…" : "📷 Ver foto"}
        </button>
    );
}
