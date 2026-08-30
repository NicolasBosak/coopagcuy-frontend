interface Opcion {
    value: string;
    label: string;
}

interface Props {
    label: string;
    value: string;
    onChange: (valor: string) => void;
    opciones: Opcion[];
    cargando: boolean;
    error: boolean;
    // Reactivo: quien llama a este componente lo saca de `useIsOnline()`
    // (contexto que provee MainLayout), nunca de `navigator.onLine` leído
    // directamente en un render — eso no se entera de los cambios de
    // conexión y el aviso de abajo se quedaría congelado con el valor que
    // tenía al montarse.
    isOnline: boolean;
    onReintentar: () => void;
    disabled?: boolean;
}

/**
 * Selector para un catálogo que viene del API (provincia, cantón, centro de
 * acopio…), con sus cuatro estados: cargando, cargado, sin conexión y "no se
 * pudo cargar".
 *
 * TanStack Query deja `isLoading` en `false` tanto cuando la consulta
 * terminó como cuando falló o quedó pausada sin red: sin distinguir esos
 * casos, un fallo se ve idéntico a un catálogo vacío, y el `required` del
 * select deja al usuario sin poder avanzar y sin saber por qué.
 *
 * El aviso solo REEMPLAZA al select cuando de verdad no hay ninguna opción
 * que ofrecer (`opciones.length === 0`). Provincias, cantones y centros se
 * cachean 10 minutos (`CACHE_LARGO` en `useCatalogos.ts`): con la caché ya
 * poblada, TanStack Query v5 deja un refetch fallido en `status: "error"`
 * pero CONSERVA `data`, así que ocultar un select perfectamente usable
 * detrás de un aviso de error sería un defecto peor que el que este
 * componente existe para evitar. Cuando sí hay opciones, el aviso pasa a
 * acompañar al select (un texto corto debajo) en vez de sustituirlo.
 *
 * Dentro del aviso, el orden de comprobación es sin conexión primero, error
 * de servidor después y catálogo genuinamente vacío al final: en TanStack
 * Query v5 una consulta offline queda pausada (`fetchStatus: "paused"`), no
 * en error — `isLoading` e `isError` son ambos `false` — así que mirar
 * `isError` antes que `isOnline` confundiría "sin señal" con "no hay nada
 * creado todavía". Mismo orden que usan `SelectorCanton` y las tablas de
 * catálogos.
 *
 * Como al reemplazar el select también desaparece su `required` nativo,
 * quien use este componente para un catálogo obligatorio debe combinarlo con
 * `catalogoBloqueado` (en `hooks/useCatalogos.ts` — no puede vivir en este
 * archivo porque el lint de react-refresh exige que un archivo de componente
 * solo exporte componentes) para no dejar que se guarde con un valor
 * centinela.
 */
export function SelectorCatalogo({
    label, value, onChange, opciones, cargando, error, isOnline, onReintentar, disabled,
}: Props) {
    const hayOpciones = opciones.length > 0;

    const aviso = !isOnline
        ? {
            texto: "Sin conexión: no se pudo actualizar el catálogo.",
            explicacion: "Conéctate al menos una vez para poder elegir.",
            reintentar: false,
        }
        : error
            ? {
                texto: "No se pudo cargar el catálogo.",
                explicacion: "Revisa la conexión con el servidor e intenta de nuevo.",
                reintentar: true,
            }
            : !hayOpciones && !cargando
                ? {
                    texto: "No hay opciones disponibles.",
                    explicacion: null,
                    reintentar: false,
                }
                : null;

    return (
        <div>
            {label && (
                <label className="block text-xs font-bold uppercase tracking-wide
                    text-gray-500 mb-1">
                    {label}
                </label>
            )}

            {aviso && !hayOpciones ? (
                <div className="rounded-xl border-2 border-teja-100 bg-teja-50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-teja-700">
                        {aviso.texto}
                    </p>
                    {aviso.explicacion && (
                        <p className="mt-0.5 text-xs text-teja-600">
                            {aviso.explicacion}
                        </p>
                    )}
                    {aviso.reintentar && (
                        <button
                            type="button"
                            onClick={onReintentar}
                            className="mt-1.5 text-xs font-bold text-teja-700
                       underline underline-offset-2"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <select
                        required
                        disabled={disabled}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none
                       disabled:bg-gray-50 disabled:text-gray-400"
                    >
                        <option value="" disabled>
                            {cargando ? "Cargando…" : "Seleccionar…"}
                        </option>
                        {opciones.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {/* El select ya tiene opciones (de la caché de 10 minutos), pero
                        el refresco en curso falló o no hay señal: se avisa sin
                        bloquear, porque lo que ya está en pantalla sigue siendo
                        elegible. */}
                    {aviso && hayOpciones && (
                        <p className="mt-1 text-xs text-teja-600">
                            {aviso.texto}
                            {aviso.reintentar && (
                                <>
                                    {" "}
                                    <button
                                        type="button"
                                        onClick={onReintentar}
                                        className="font-bold underline underline-offset-2"
                                    >
                                        Reintentar
                                    </button>
                                </>
                            )}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
