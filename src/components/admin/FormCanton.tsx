import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { geografiaApi } from "../../api/catalogos";
import { ModalShell } from "../ui/ModalShell";
import { SelectorCatalogo } from "../ui/SelectorCatalogo";
import { useProvincias, catalogoBloqueado, conValorVigente } from "../../hooks/useCatalogos";
import type { Canton } from "../../types/admin";

interface Props {
    canton: Canton | null; // null = crear nuevo
    onClose: () => void;
}

export function FormCanton({ canton, onClose }: Props) {
    const qc = useQueryClient();
    const editando = canton !== null;

    const [nombre, setNombre] = useState(canton?.nombre ?? "");
    const [provinciaId, setProvinciaId] = useState<number | undefined>(canton?.provinciaId);
    const [error, setError] = useState<string | null>(null);

    // Con inactivas incluidas: si el cantón que se edita cuelga de una
    // provincia dada de baja, su opción tiene que seguir apareciendo o el
    // selector se vería vacío pese a tener un valor asignado.
    //
    // conValorVigente ahora recibe el predicado de "está activo" en vez de
    // asumir un campo `activo`: Provincia lo llama `activa`, y con el
    // predicado explícito el genérico tipa igual para las tres entidades.
    const {
        data: provinciasTodas = [], isLoading: cargandoProvincias,
        isError: errorProvincias, refetch: refetchProvincias,
    } = useProvincias(true);
    const provincias = useMemo(
        () => conValorVigente(provinciasTodas, provinciaId || null, (p) => p.id, (p) => p.activa),
        [provinciasTodas, provinciaId]);

    // Capa 1 (visible): con el catálogo de provincias caído o sin elegir,
    // el botón de guardar queda deshabilitado (misma disciplina que
    // FormComunidad con sus dos catálogos).
    const catalogoInvalido = catalogoBloqueado(errorProvincias, provinciaId ?? "");

    const mutation = useMutation({
        mutationFn: async () => {
            const body = { nombre, provinciaId: provinciaId! };
            if (editando) {
                await geografiaApi.actualizarCanton(canton.id, body);
            } else {
                await geografiaApi.crearCanton(body);
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["cantones"] });
            // Cambia el número de cantones activos de la provincia afectada:
            // sin esto, TablaProvincias mostraría el conteo desactualizado
            // hasta que algo más invalide su caché.
            qc.invalidateQueries({ queryKey: ["provincias"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo guardar el cantón.");
        },
    });

    return (
        <ModalShell
            onClose={onClose}
            title={editando ? "Editar cantón" : "Nuevo cantón"}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-canton"
                        disabled={mutation.isPending || catalogoInvalido}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Guardar cantón"}
                    </button>
                </div>
            }
        >
            <form
                id="form-canton"
                onSubmit={(e) => {
                    e.preventDefault();
                    setError(null);
                    // Capa 2 (garantía): repite la misma condición del botón
                    // por si se llega aquí sin pasar por él.
                    if (catalogoInvalido) {
                        setError("Elige una provincia válida antes de guardar.");
                        return;
                    }
                    mutation.mutate();
                }}
                className="space-y-4"
            >
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Nombre del cantón
                    </label>
                    <input
                        type="text" required value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Por ejemplo: Pucará"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <SelectorCatalogo
                    label="Provincia"
                    value={provinciaId ? String(provinciaId) : ""}
                    onChange={(v) => setProvinciaId(v ? Number(v) : undefined)}
                    cargando={cargandoProvincias}
                    error={errorProvincias}
                    onReintentar={() => refetchProvincias()}
                    opciones={provincias.map((p) => ({
                        value: String(p.id),
                        label: `${p.nombre}${p.activa ? "" : " — dada de baja"}`,
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
