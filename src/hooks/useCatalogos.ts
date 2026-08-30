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
    return (codigo: string) =>
        centros.find((c) => c.codigo === codigo)?.nombre ?? codigo;
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
