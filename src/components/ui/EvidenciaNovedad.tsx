import { recepcionApi } from "../../api/recepcion";
import { ImagenProtegida } from "./ImagenProtegida";

interface Props {
    novedadId: number;
    autoCargar?: boolean;
}

/**
 * Evidencia fotográfica de una novedad clínica.
 *
 * La evidencia caduca a los 90 días; pasada esa fecha el API responde 404 y
 * aquí se dice, en vez de dejar un hueco sin explicación. Cualquier otro
 * fallo (sin red, 5xx, 401…) se reporta distinto y con reintento: la foto
 * puede seguir existiendo y hace falta para reclamar al proveedor.
 */
export function EvidenciaNovedad({ novedadId, autoCargar = false }: Props) {
    return (
        <ImagenProtegida
            claveCache={["novedad-foto", novedadId]}
            descargar={() => recepcionApi.fotoNovedad(novedadId)}
            autoCargar={autoCargar}
            textoBoton="Ver foto del defecto"
            textoReintentar="Reintentar foto"
            textoErrorCarga="No se pudo cargar la evidencia."
            textoCaducada="La evidencia ya no está disponible (se borra a los 90 días)."
            textoAlternativo="Evidencia fotográfica de la novedad clínica"
            textoCargando="Cargando la evidencia"
            tituloAmpliar="Abrir la evidencia en tamaño completo"
        />
    );
}
