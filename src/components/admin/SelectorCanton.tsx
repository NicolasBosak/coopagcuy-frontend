import { useEffect, useState } from "react";
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
 */
export function SelectorCanton({ cantonId, onCambio, requerido = true }: Props) {
    const [provinciaId, setProvinciaId] = useState<number | undefined>();

    const { data: provincias = [] } = useProvincias();
    const { data: cantones = [] } = useCantones(provinciaId);
    const { data: todosLosCantones = [] } = useCantones();

    // Al abrir en modo edición llega un cantón pero no su provincia: hay que
    // deducirla o el primer selector arrancaría vacío y el segundo, deshabilitado,
    // dejando al usuario sin ver lo que ya está guardado.
    useEffect(() => {
        if (cantonId === undefined || provinciaId !== undefined) return;
        const suyo = todosLosCantones.find((c) => c.id === cantonId);
        // No es el patrón de "estado derivado de props" que la regla evita:
        // todosLosCantones llega async (puede que el catálogo aún no haya
        // respondido en el primer render), así que el efecto tiene que
        // reintentar hasta que aparezca. La guarda de arriba (provinciaId
        // !== undefined) hace que converja en un solo set, no en un bucle.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (suyo) setProvinciaId(suyo.provinciaId);
    }, [cantonId, provinciaId, todosLosCantones]);

    return (
        <>
            <div>
                <label className="block text-xs font-bold uppercase tracking-wide
                    text-gray-500 mb-1">
                    Provincia
                </label>
                <select
                    required={requerido}
                    value={provinciaId ?? ""}
                    onChange={(e) => {
                        setProvinciaId(e.target.value ? Number(e.target.value) : undefined);
                        // El cantón elegido pertenecía a la provincia anterior:
                        // sin limpiarlo, el formulario enviaría un cantón que no
                        // está en la lista que el usuario tiene delante.
                        onCambio(undefined);
                    }}
                    className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                        text-base focus:border-primary-500 focus:outline-none"
                >
                    <option value="">Elige una provincia…</option>
                    {provincias.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase tracking-wide
                    text-gray-500 mb-1">
                    Cantón
                </label>
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
                        {provinciaId ? "Elige un cantón…" : "Elige antes la provincia"}
                    </option>
                    {cantones.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
            </div>
        </>
    );
}
