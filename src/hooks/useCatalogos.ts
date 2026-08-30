import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { geografiaApi, centrosAcopioApi } from "../api/catalogos";

// El catálogo cambia muy de tanto en tanto —una provincia nueva es un evento
// del año— así que se cachea largo. Sin esto, cada pantalla que pinta un
// selector de CAT dispararía su propia petición al montarse.
const CACHE_LARGO = { staleTime: 10 * 60 * 1000 };

export function useProvincias(incluirInactivas = false) {
    return useQuery({
        queryKey: ["provincias", incluirInactivas],
        queryFn: () => geografiaApi.listarProvincias(incluirInactivas),
        ...CACHE_LARGO,
    });
}

// provinciaId undefined = todos los cantones. El selector dependiente de
// FormComunidad lo usa con la provincia elegida.
export function useCantones(provinciaId?: number, incluirInactivos = false) {
    return useQuery({
        queryKey: ["cantones", provinciaId ?? null, incluirInactivos],
        queryFn: () => geografiaApi.listarCantones(provinciaId, incluirInactivos),
        ...CACHE_LARGO,
    });
}

export function useCentrosAcopio(incluirInactivos = false) {
    return useQuery({
        queryKey: ["centros-acopio", incluirInactivos],
        queryFn: () => centrosAcopioApi.listar(incluirInactivos),
        ...CACHE_LARGO,
    });
}

/**
 * Código de CAT -> nombre legible, para las tablas que solo tienen el código.
 *
 * Devuelve el código tal cual mientras el catálogo carga o si el centro fue
 * desactivado: una celda que dice "PAT" es peor que una que dice "Patococha",
 * pero muchísimo mejor que una vacía en un histórico. Por eso consulta
 * INCLUYENDO inactivos: un registro histórico puede apuntar a un centro que
 * ya se dio de baja, y aun así hay que poder resolver su nombre.
 */
export function useNombreCat() {
    const { data: centros = [] } = useCentrosAcopio(true);
    // useCallback: sin esto se devuelve un cierre nuevo en cada render, y
    // cualquier efecto o memo que lo incluya en sus dependencias se
    // reejecutaría sin necesidad.
    return useCallback(
        (codigo: string) => centros.find((c) => c.codigo === codigo)?.nombre ?? codigo,
        [centros],
    );
}

/**
 * Filtra un catálogo a solo sus elementos activos, pero conserva el que ya
 * tiene asignado el registro que se está editando aunque esté desactivado.
 *
 * Sin esto, abrir para editar un registro cuyo centro/cantón fue dado de
 * baja mostraría el selector como si no tuviera nada asignado, y el
 * `required` obligaría a reasignarlo sin que nadie lo haya pedido. El
 * elemento inactivo solo aparece cuando coincide con `valorActual`: nunca
 * se ofrece como opción nueva para otros registros.
 *
 * `estaActivo` recibe el predicado en vez de asumir un campo `activo`
 * fijo: `Canton` y `CentroAcopio` lo llaman `activo`, pero `Provincia` lo
 * llama `activa` (concuerda en género con el sustantivo). Antes de esto, el
 * genérico exigía `{ activo: boolean }` y `FormCanton` no podía reusarlo
 * para su selector de provincia, así que traía la misma lógica copiada a
 * mano — justo la duplicación que este componente existe para evitar.
 */
export function conValorVigente<T>(
    items: T[],
    valorActual: string | number | null | undefined,
    clave: (item: T) => string | number,
    estaActivo: (item: T) => boolean,
): T[] {
    const activos = items.filter(estaActivo);
    if (valorActual === null || valorActual === undefined || valorActual === "" || valorActual === 0)
        return activos;
    if (activos.some((i) => clave(i) === valorActual)) return activos;
    const vigente = items.find((i) => clave(i) === valorActual);
    return vigente ? [...activos, vigente] : activos;
}

/**
 * Etiqueta larga para los selectores: "Patococha (Pucará, Azuay)".
 *
 * El sufijo no es adorno. Una comunidad entrega en el CAT que le queda más
 * cerca, aunque sea de otra provincia; en cuanto haya dos provincias, sin
 * el cantón y la provincia el operador no sabe cuál está eligiendo.
 */
export function etiquetaCat(c: { nombre: string; canton: string; provincia: string }) {
    return `${c.nombre} (${c.canton}, ${c.provincia})`;
}

/**
 * Indica si un catálogo obligatorio impide continuar: cuando falló (la rama
 * de error de `SelectorCatalogo` reemplaza al `<select>`, y con él se va la
 * validación nativa `required` del navegador) o cuando todavía no hay nada
 * elegido.
 *
 * Vive aquí y no junto a `SelectorCatalogo` porque el lint de react-refresh
 * de este repo exige que un archivo de componente solo exporte componentes.
 * Se usa en dos capas — deshabilitar el botón de guardar (visible) y volver
 * a comprobarla dentro del propio manejador de envío (garantía, por si se
 * llega ahí por cualquier otro camino) — para que cada formulario use la
 * MISMA condición en vez de reimplementarla y que alguno la olvide.
 */
export function catalogoBloqueado(error: boolean, valor: string | number): boolean {
    return error || !valor;
}
