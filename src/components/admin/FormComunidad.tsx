import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import { SelectorCatalogo } from "../ui/SelectorCatalogo";
import type { Comunidad } from "../../types/admin";
import { useCantones, useCentrosAcopio, etiquetaCat, conValorVigente } from "../../hooks/useCatalogos";

interface Props {
    comunidad: Comunidad | null; // null = crear nueva
    onClose: () => void;
}

export function FormComunidad({ comunidad, onClose }: Props) {
    const qc = useQueryClient();
    const editando = comunidad !== null;

    const [nombre, setNombre] = useState(comunidad?.nombre ?? "");
    // 0 = nada elegido todavía: no hay un cantón "por defecto" razonable
    // ahora que el catálogo llega del servidor.
    const [cantonId, setCantonId] = useState(comunidad?.cantonId ?? 0);
    const [cat, setCat] = useState(comunidad?.catReferencia ?? "");
    const [error, setError] = useState<string | null>(null);

    // La gestión de provincias y cantones (alta, edición) es de la Task 8;
    // aquí solo se listan para poblar el selector de esta comunidad.
    // Se piden con inactivos incluidos (misma consulta que useNombreCat, así
    // que no duplica la petición) y se filtran abajo con conValorVigente:
    // así, si el cantón o el CAT de ESTA comunidad fue dado de baja después
    // de asignárselo, su opción se conserva en vez de desaparecer.
    const {
        data: cantonesTodos = [], isLoading: cargandoCantones,
        isError: errorCantones, refetch: refetchCantones,
    } = useCantones(undefined, true);
    const {
        data: centrosTodos = [], isLoading: cargandoCentros,
        isError: errorCentros, refetch: refetchCentros,
    } = useCentrosAcopio(true);

    const cantones = useMemo(
        () => conValorVigente(cantonesTodos, cantonId || null, (c) => c.id),
        [cantonesTodos, cantonId]);
    const centros = useMemo(
        () => conValorVigente(centrosTodos, cat || null, (c) => c.codigo),
        [centrosTodos, cat]);

    const mutation = useMutation({
        mutationFn: async () => {
            const body = {
                nombre, cantonId, catReferencia: cat,
                // Al editar hay que reenviar las coordenadas existentes: el
                // API las asigna incondicionalmente con lo que llegue en el
                // cuerpo, y este formulario no las edita. Omitirlas las
                // pondría en null y la comunidad desaparecería del mapa
                // público con solo cambiarle el nombre.
                ...(editando && {
                    latitud: comunidad.latitud,
                    longitud: comunidad.longitud,
                    altitudMinM: comunidad.altitudMinM,
                    altitudMaxM: comunidad.altitudMaxM,
                }),
            };
            if (editando) {
                await catalogosApi.actualizarComunidad(comunidad.id, body);
            } else {
                await catalogosApi.crearComunidad(body);
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["comunidades"] });
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
                        disabled={mutation.isPending}
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
                onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}
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

                <SelectorCatalogo
                    label="Cantón"
                    value={cantonId ? String(cantonId) : ""}
                    onChange={(v) => setCantonId(Number(v))}
                    cargando={cargandoCantones}
                    error={errorCantones}
                    onReintentar={() => refetchCantones()}
                    opciones={cantones.map((c) => ({
                        value: String(c.id),
                        label: `${c.nombre} (${c.provincia})${c.activo ? "" : " — dado de baja"}`,
                    }))}
                />

                <SelectorCatalogo
                    label="Centro de acopio de referencia"
                    value={cat}
                    onChange={setCat}
                    cargando={cargandoCentros}
                    error={errorCentros}
                    onReintentar={() => refetchCentros()}
                    opciones={centros.map((c) => ({
                        value: c.codigo,
                        label: `${etiquetaCat(c)}${c.activo ? "" : " — dado de baja"}`,
                    }))}
                />

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
