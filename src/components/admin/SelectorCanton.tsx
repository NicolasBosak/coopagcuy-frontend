import { useMemo, useState } from "react";
import { SelectorCatalogo } from "../ui/SelectorCatalogo";
import { useIsOnline } from "../../context/useIsOnline";
import { useProvincias, useCantones, conValorVigente } from "../../hooks/useCatalogos";

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
 * de acopio y el de la comunidad— y las reglas de abajo son fáciles de
 * implementar mal por separado.
 *
 * El select de Provincia usa `SelectorCatalogo` (que ya cubre sus cuatro
 * estados incluyendo "sin conexión" y "hay caché, no ocultar el select");
 * el de Cantón no: mientras no hay provincia elegida, ese select tiene un
 * QUINTO estado que `SelectorCatalogo` no modela —"todavía no aplica"— con
 * su propio texto ("Elige antes la provincia") y sin mirar `error`/`isOnline`
 * de ninguna consulta, porque en ese momento no hay nada que el usuario
 * pueda hacer con un aviso de "no se pudo cargar". Forzarlo dentro de
 * `SelectorCatalogo` habría exigido agregarle un prop de placeholder
 * personalizado solo para este llamador.
 */
export function SelectorCanton({ cantonId, onCambio, requerido = true }: Props) {
    const isOnline = useIsOnline();

    // Con inactivas incluidas y filtradas después con `conValorVigente`
    // (mismo patrón que `FormComunidad`): si la provincia o el cantón que
    // ya tiene asignado este registro fueron dados de baja después de
    // asignárselos, sus opciones se conservan en vez de desaparecer. Sin
    // esto, editar un registro así dejaba la provincia en blanco (no se
    // podía deducir desde un cantón inactivo, que las consultas de solo
    // activos no traían) y el cantón deshabilitado pidiendo "Elige antes la
    // provincia" — el administrador no podía ver qué tenía guardado, y en
    // cuanto tocaba el select de provincia para mirar, `onCambio(undefined)`
    // le borraba la asignación.
    const {
        data: provinciasTodas = [], isLoading: cargandoProvincias,
        isError: errorProvincias, refetch: refetchProvincias,
    } = useProvincias(true);

    // Todos los cantones, activos e inactivos, sin filtrar por provincia:
    // misma clave de caché que usa `FormComunidad` para su propio
    // `cantonesTodos`, así que la comparten en vez de duplicar la petición.
    // Sirve para deducir la provincia de un `cantonId` que llega en modo
    // edición (ver `provinciaDerivada` abajo). Ojo: esto NO significa que
    // este componente dispare una sola petición de cantones en total — la
    // consulta de abajo, filtrada por la provincia elegida, es una segunda
    // consulta aparte.
    const { data: todosLosCantones = [] } = useCantones(undefined, true);

    // Provincia elegida a mano por el usuario. Empieza sin definir: mientras
    // no se toque el selector, la deducción de abajo la completa.
    const [provinciaElegida, setProvinciaElegida] = useState<number | undefined>();

    // Al abrir en modo edición llega un cantón pero no su provincia: hay que
    // deducirla o el primer selector arrancaría vacío y el segundo,
    // deshabilitado, dejando al usuario sin ver lo que ya está guardado.
    //
    // Se deduce como valor DERIVADO del render, no con un `useEffect` que
    // llama a `setState`: un efecto fuerza un render extra con parpadeo, y
    // encima dispara el lint `react-hooks/set-state-in-effect` que existe
    // justo para evitarlo. En cuanto el usuario elige una provincia a mano,
    // `provinciaElegida` queda definida y manda por encima de esta
    // deducción; para entonces el `onChange` de abajo ya limpió `cantonId`
    // con `onCambio(undefined)`, así que la deducción tampoco tiene de dónde
    // volver a calcularse con el valor viejo.
    const provinciaDerivada = todosLosCantones.find((c) => c.id === cantonId)?.provinciaId;
    const provinciaId = provinciaElegida ?? provinciaDerivada;

    // `provinciasTodas` ya incluye inactivas, así que cualquier
    // `provinciaId` real (elegido a mano o derivado del cantón) aparece
    // siempre en `provincias`, dada de baja o no.
    const provincias = useMemo(
        () => conValorVigente(
            provinciasTodas, provinciaId ?? null, (p) => p.id, (p) => p.activa),
        [provinciasTodas, provinciaId]);

    const {
        data: cantonesDeProvinciaTodos = [], isLoading: cargandoCantones,
        isError: errorCantones, refetch: refetchCantones,
    } = useCantones(provinciaId, true);
    const cantonesDeProvincia = useMemo(
        () => conValorVigente(
            cantonesDeProvinciaTodos, cantonId ?? null, (c) => c.id, (c) => c.activo),
        [cantonesDeProvinciaTodos, cantonId]);

    return (
        <>
            <SelectorCatalogo
                label="Provincia"
                value={provinciaId ? String(provinciaId) : ""}
                onChange={(v) => {
                    setProvinciaElegida(v ? Number(v) : undefined);
                    // El cantón elegido pertenecía a la provincia anterior:
                    // sin limpiarlo, el formulario enviaría un cantón que no
                    // está en la lista que el usuario tiene delante.
                    onCambio(undefined);
                }}
                cargando={cargandoProvincias}
                error={errorProvincias}
                isOnline={isOnline}
                onReintentar={() => refetchProvincias()}
                opciones={provincias.map((p) => ({
                    value: String(p.id),
                    label: `${p.nombre}${p.activa ? "" : " — dada de baja"}`,
                }))}
            />

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
                            <option key={c.id} value={c.id}>
                                {c.nombre}{c.activo ? "" : " — dado de baja"}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </>
    );
}
