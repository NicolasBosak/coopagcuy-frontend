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
 */
export function conValorVigente<T extends { activo: boolean }>(
    items: T[],
    valorActual: string | number | null | undefined,
    clave: (item: T) => string | number,
): T[] {
    const activos = items.filter((i) => i.activo);
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
