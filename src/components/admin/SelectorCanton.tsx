import { useState } from "react";
import { useProvincias, useCantones } from "../../hooks/useCatalogos";

interface Props {
    cantonId: number | undefined;
    onCambio: (id: number | undefined) => void;
    requerido?: boolean;
}

/**
 * Elegir un cantón, en dos pasos: provincia y después cantón.
 *
 * En un paso solo serían 221 opciones en una lista plana, con cantones
 * homónimos ("Bolívar" está en Carchi y en Manabí) que el usuario no podría
 * distinguir.
 *
 * Vive suelto y no dentro de un formulario porque lo usan dos —el del centro
 * de acopio y el de la comunidad— y las tres reglas de abajo son fáciles de
 * implementar mal por separado.
 *
 * No usa `SelectorCatalogo` (a diferencia de `FormCanton`): ese componente
 * reemplaza el select por el aviso de error en cuanto `error` es cierto, sin
 * mirar si ya hay opciones cacheadas que mostrar, y tampoco distingue "sin
 * conexión" de un error real. Provincias y cantones se cachean 10 minutos
 * (`CACHE_LARGO` en `useCatalogos`), así que envolver esto en
 * `SelectorCatalogo` escondería un select perfectamente usable —con datos
 * de esa caché— detrás de un aviso apenas la consulta quedara en pausa por
 * falta de red. En vez de eso, cada select de aquí sigue el mismo patrón ya
 * usado en `FormLote` y `JaulaEnArmado` para el mismo problema: el aviso
 * solo reemplaza al select cuando de verdad no hay ninguna opción que
 * mostrar, y dentro de ese caso, el orden de comprobación es sin conexión
 * primero, error después y catálogo vacío al final (igual que
 * `TablaProvincias`/`TablaCantones`) — porque en TanStack Query v5 una
 * consulta *offline* queda pausada, no en error: `isLoading` e `isError`
 * son ambos `false`, y mirar `isError` antes que `navigator.onLine`
 * confundiría "sin señal" con "el catálogo está vacío".
 */
export function SelectorCanton({ cantonId, onCambio, requerido = true }: Props) {
    const isOnline = navigator.onLine;

    const {
        data: provincias = [], isLoading: cargandoProvincias,
        isError: errorProvincias, refetch: refetchProvincias,
    } = useProvincias();

    // Todos los cantones activos, sin filtrar por provincia: misma clave de
    // caché que `useCantones()` sin argumentos, así que no dispara una
    // petición aparte. Sirve para deducir la provincia de un `cantonId` que
    // llega en modo edición (ver `provinciaDerivada` abajo).
    const { data: todosLosCantones = [] } = useCantones();

    // Provincia elegida a mano por el usuario. Empieza sin definir: mientras
    // no se toque el selector, la deducción de abajo la completa.
    const [provinciaElegida, setProvinciaElegida] = useState<number | undefined>();

    // Al abrir en modo edición llega un cantón pero no su provincia: hay que
    // deducirla o el primer selector arrancaría vacío y el segundo,
    // deshabilitado, dejando al usuario sin ver lo que ya está guardado.
    //
    // Se deduce como valor DERIVADO del render, no con un `useEffect` que
    // llama a `setState` (ese patrón ya se cambió en la Task 7, ver el
    // historial de `FormLote`): un efecto fuerza un render extra con
    // parpadeo, y encima dispara el lint `react-hooks/set-state-in-effect`
    // que existe justo para evitarlo. En cuanto el usuario elige una
    // provincia a mano, `provinciaElegida` queda definida y manda por
    // encima de esta deducción; para entonces el `onChange` de abajo ya
    // limpió `cantonId` con `onCambio(undefined)`, así que la deducción
    // tampoco tiene de dónde volver a calcularse con el valor viejo.
    const provinciaDerivada = todosLosCantones.find((c) => c.id === cantonId)?.provinciaId;
    const provinciaId = provinciaElegida ?? provinciaDerivada;

    const {
        data: cantonesDeProvincia = [], isLoading: cargandoCantones,
        isError: errorCantones, refetch: refetchCantones,
    } = useCantones(provinciaId);

    return (
        <>
            <div>
                <label className="block text-xs font-bold uppercase tracking-wide
                    text-gray-500 mb-1">
                    Provincia
                </label>
                {provincias.length === 0 && !cargandoProvincias ? (
                    <div className="rounded-xl border-2 border-teja-100 bg-teja-50 px-3 py-2.5">
                        <p className="text-sm font-semibold text-teja-700">
                            {!isOnline
                                ? "Sin conexión: no se pudo cargar el catálogo de provincias."
                                : errorProvincias
                                    ? "No se pudo cargar el catálogo de provincias."
                                    : "Todavía no hay provincias creadas."}
                        </p>
                        {isOnline && errorProvincias && (
                            <button
                                type="button"
                                onClick={() => refetchProvincias()}
                                className="mt-1.5 text-xs font-bold text-teja-700
                                   underline underline-offset-2"
                            >
                                Reintentar
                            </button>
                        )}
                    </div>
                ) : (
                    <select
                        required={requerido}
                        value={provinciaId ?? ""}
                        onChange={(e) => {
                            setProvinciaElegida(e.target.value ? Number(e.target.value) : undefined);
                            // El cantón elegido pertenecía a la provincia anterior:
                            // sin limpiarlo, el formulario enviaría un cantón que no
                            // está en la lista que el usuario tiene delante.
                            onCambio(undefined);
                        }}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                            text-base focus:border-primary-500 focus:outline-none"
                    >
                        <option value="">
                            {cargandoProvincias ? "Cargando…" : "Elige una provincia…"}
                        </option>
                        {provincias.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                )}
            </div>

            <div>
                <label className="block text-xs font-bold uppercase tracking-wide
                    text-gray-500 mb-1">
                    Cantón
                </label>
                {/* Sin provincia elegida todavía no hay nada que evaluar: el
                    select se muestra deshabilitado con su propia pista, sin
                    pasar por el aviso de error (que es para cuando SÍ hay
                    provincia pero su catálogo de cantones no responde). */}
                {provinciaId && cantonesDeProvincia.length === 0 && !cargandoCantones ? (
                    <div className="rounded-xl border-2 border-teja-100 bg-teja-50 px-3 py-2.5">
                        <p className="text-sm font-semibold text-teja-700">
                            {!isOnline
                                ? "Sin conexión: no se pudo cargar el catálogo de cantones."
                                : errorCantones
                                    ? "No se pudo cargar el catálogo de cantones."
                                    : "Esta provincia todavía no tiene cantones creados."}
                        </p>
                        {isOnline && errorCantones && (
                            <button
                                type="button"
                                onClick={() => refetchCantones()}
                                className="mt-1.5 text-xs font-bold text-teja-700
                                   underline underline-offset-2"
                            >
                                Reintentar
                            </button>
                        )}
                    </div>
                ) : (
                    <select
                        required={requerido}
                        value={cantonId ?? ""}
                        disabled={!provinciaId}
                        onChange={(e) =>
                            onCambio(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                            text-base disabled:bg-gray-100
                            focus:border-primary-500 focus:outline-none"
                    >
                        <option value="">
                            {!provinciaId
                                ? "Elige antes la provincia"
                                : cargandoCantones
                                    ? "Cargando…"
                                    : "Elige un cantón…"}
                        </option>
                        {cantonesDeProvincia.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                )}
            </div>
        </>
    );
}
