import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import { SelectorCatalogo } from "../ui/SelectorCatalogo";
import { SelectorCanton } from "./SelectorCanton";
import { useIsOnline } from "../../context/useIsOnline";
import type { Comunidad } from "../../types/admin";
import {
    useCentrosAcopio, etiquetaCat, conValorVigente, catalogoBloqueado,
} from "../../hooks/useCatalogos";

interface Props {
    comunidad: Comunidad | null; // null = crear nueva
    onClose: () => void;
}

export function FormComunidad({ comunidad, onClose }: Props) {
    const qc = useQueryClient();
    const editando = comunidad !== null;
    const isOnline = useIsOnline();

    const [nombre, setNombre] = useState(comunidad?.nombre ?? "");
    // undefined = nada elegido todavía. El encadenamiento provincia->cantón
    // (deducción de la provincia al editar, reseteo al cambiar de
    // provincia, los cuatro estados) lo resuelve SelectorCanton: aquí solo
    // se guarda el id elegido.
    const [cantonId, setCantonId] = useState<number | undefined>(comunidad?.cantonId);
    const [cat, setCat] = useState(comunidad?.catReferencia ?? "");
    const [error, setError] = useState<string | null>(null);

    // Ubicación en el mapa público. Opcional: una comunidad nueva nace sin
    // coordenadas y funciona igual, solo que sin pin (ver coordenadas.ts en
    // el front, MapaOrigen). null de entrada al crear; los valores existentes
    // al editar, para que no baste con abrir y guardar el formulario para
    // borrarlos sin querer.
    const [latitud, setLatitud] = useState<number | null>(comunidad?.latitud ?? null);
    const [longitud, setLongitud] = useState<number | null>(comunidad?.longitud ?? null);
    const [altitudMin, setAltitudMin] = useState<number | null>(comunidad?.altitudMinM ?? null);
    const [altitudMax, setAltitudMax] = useState<number | null>(comunidad?.altitudMaxM ?? null);

    // El selector de CAT sigue viviendo aquí (no en SelectorCanton, que solo
    // resuelve cantón): se piden con inactivos incluidos (misma consulta que
    // useNombreCat, así que no duplica la petición) y se filtran abajo con
    // conValorVigente, para que el CAT ya asignado a ESTA comunidad se
    // conserve en la lista aunque haya sido dado de baja después.
    const {
        data: centrosTodos = [], isLoading: cargandoCentros,
        isError: errorCentros, refetch: refetchCentros,
    } = useCentrosAcopio(true);

    const centros = useMemo(
        () => conValorVigente(centrosTodos, cat || null, (c) => c.codigo, (c) => c.activo),
        [centrosTodos, cat]);

    // Capa 1 (visible): sin cantón elegido o con el catálogo de CAT en error
    // (o sin elegir), el botón de guardar queda deshabilitado. Antes de
    // esto, la rama de error de SelectorCatalogo quitaba el <select
    // required> pero nada avisaba que ya no había forma de bloquear el
    // envío.
    const catalogoInvalido = !cantonId || catalogoBloqueado(errorCentros, cat);

    const mutation = useMutation({
        mutationFn: async () => {
            const body = {
                nombre, cantonId: cantonId!, catReferencia: cat,
                // El API las asigna incondicionalmente con lo que llegue en
                // el cuerpo: si se omitieran quedarían en null y la
                // comunidad desaparecería del mapa público con solo
                // cambiarle el nombre. Van siempre, tomadas del estado del
                // formulario (null si no se han tocado).
                latitud, longitud,
                altitudMinM: altitudMin, altitudMaxM: altitudMax,
            };
            if (editando) {
                await catalogosApi.actualizarComunidad(comunidad.id, body);
            } else {
                await catalogosApi.crearComunidad(body);
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["comunidades"] });
            // TablaCantones pinta `c.totalComunidades`: sin esto, crear o
            // editar una comunidad deja ese conteo desactualizado hasta que
            // algo más, sin relación, invalide la caché de cantones — y
            // puede llegar a contradecir en pantalla el mensaje del 409 que
            // el administrador esté leyendo en ese momento en otra pestaña.
            qc.invalidateQueries({ queryKey: ["cantones"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo guardar la comunidad.");
        },
    });

    return (
        <ModalShell
            onClose={onClose}
            title={editando ? "Editar comunidad" : "Nueva comunidad"}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-comunidad"
                        disabled={mutation.isPending || catalogoInvalido}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Guardar comunidad"}
                    </button>
                </div>
            }
        >
            <form
                id="form-comunidad"
                onSubmit={(e) => {
                    e.preventDefault();
                    setError(null);
                    // Capa 2 (garantía): repite la misma condición del botón
                    // por si se llega aquí sin pasar por él (por ejemplo,
                    // Enter dentro de un campo de texto). Sin esto, un
                    // catálogo caído dejaría guardar cantonId: 0 o
                    // catReferencia: "" con solo forzar el envío del form.
                    if (catalogoInvalido) {
                        setError("Elige un cantón y un centro de acopio válidos antes de guardar.");
                        return;
                    }
                    mutation.mutate();
                }}
                className="space-y-4"
            >
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Nombre de la comunidad
                    </label>
                    <input
                        type="text" required value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Por ejemplo: Patococha"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <SelectorCanton cantonId={cantonId} onCambio={setCantonId} />

                <div>
                    <SelectorCatalogo
                        label="Centro de acopio de referencia"
                        value={cat}
                        onChange={setCat}
                        cargando={cargandoCentros}
                        error={errorCentros}
                        isOnline={isOnline}
                        onReintentar={() => refetchCentros()}
                        opciones={centros.map((c) => ({
                            value: c.codigo,
                            label: `${etiquetaCat(c)}${c.activo ? "" : " — dado de baja"}`,
                        }))}
                    />
                    {/* La lista NO se filtra por la provincia elegida arriba:
                        una comunidad entrega en el CAT que le queda más
                        cerca, aunque esté en otra provincia, y el sistema lo
                        permite a propósito (el API lo verifica con pruebas
                        propias). Este texto existe para que nadie "arregle"
                        esto dentro de unos meses agregando un filtro. */}
                    <p className="text-xs text-gray-500 mt-1">
                        Puede estar en otro cantón o en otra provincia: la comunidad
                        entrega donde le queda más cerca.
                    </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Ubicación (opcional)
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                        Sitúa la comunidad en el mapa de la ficha pública del QR.
                        Sin coordenadas la comunidad funciona igual: solo no
                        aparece dibujada.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" step="0.000001" value={latitud ?? ""}
                            onChange={(e) => setLatitud(
                                e.target.value === "" ? null : Number(e.target.value))}
                            placeholder="Latitud (-3.284722)"
                            className="h-12 px-3 rounded-xl border-2 border-gray-200
                                text-base focus:border-primary-500 focus:outline-none" />
                        <input type="number" step="0.000001" value={longitud ?? ""}
                            onChange={(e) => setLongitud(
                                e.target.value === "" ? null : Number(e.target.value))}
                            placeholder="Longitud (-79.400833)"
                            className="h-12 px-3 rounded-xl border-2 border-gray-200
                                text-base focus:border-primary-500 focus:outline-none" />
                        <input type="number" value={altitudMin ?? ""}
                            onChange={(e) => setAltitudMin(
                                e.target.value === "" ? null : Number(e.target.value))}
                            placeholder="Altitud mínima (m)"
                            className="h-12 px-3 rounded-xl border-2 border-gray-200
                                text-base focus:border-primary-500 focus:outline-none" />
                        <input type="number" value={altitudMax ?? ""}
                            onChange={(e) => setAltitudMax(
                                e.target.value === "" ? null : Number(e.target.value))}
                            placeholder="Altitud máxima (m)"
                            className="h-12 px-3 rounded-xl border-2 border-gray-200
                                text-base focus:border-primary-500 focus:outline-none" />
                    </div>
                </div>

                {error && (
                    <div className="bg-teja-50 border border-teja-100 rounded-xl
                        px-3 py-2 text-sm text-teja-700">
                        {error}
                    </div>
                )}
            </form>
        </ModalShell>
    );
}
