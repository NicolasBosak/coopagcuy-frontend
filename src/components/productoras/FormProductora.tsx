import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productorasApi } from "../../api/productoras";
import { catalogosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import { SelectorCatalogo } from "../ui/SelectorCatalogo";
import { useAuth } from "../../context/useAuth";
import type { CrearProductoraRequest, Productora } from "../../types/productora";
import {
    useCentrosAcopio, useNombreCat, etiquetaCat, conValorVigente, catalogoBloqueado,
} from "../../hooks/useCatalogos";

interface Props {
    productora?: Productora | null; // presente = modo edición (RF-105)
    onClose: () => void;
}

const EMPTY: CrearProductoraRequest = {
    nombreCompleto: "",
    cedula: "",
    comunidadId: 0,
    // Sin valor por defecto: el catálogo llega del API, así que no hay un
    // centro "seguro" para precargar aquí.
    catAsignado: "",
    telefono: "",
};

export function FormProductora({ productora = null, onClose }: Props) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const editando = productora !== null;

    // El operador de CAT queda fijado a su centro, pero NO a las comunidades
    // de ese centro: la comunidad es dónde vive la productora y el CAT es
    // dónde entrega, y en el piloto no siempre coinciden. El servidor dejó de
    // rechazar las demás en 2026-08.
    const catFijo = auth.rol === "OperadorCAT" ? auth.catAsignado : null;

    const [form, setForm] = useState<CrearProductoraRequest>(
        editando
            ? {
                nombreCompleto: productora.nombreCompleto,
                cedula: productora.cedula,
                comunidadId: productora.comunidadId,
                catAsignado: productora.catAsignado,
                telefono: productora.telefono ?? "",
            }
            // El alta arranca en el centro del operador, no en el primero de
            // la lista: el servidor lo va a sellar así de todos modos.
            : { ...EMPTY, catAsignado: catFijo ?? EMPTY.catAsignado }
    );
    const [error, setError] = useState<string | null>(null);

    // Catálogo de comunidades gestionable — RF-506
    const { data: comunidades = [] } = useQuery({
        queryKey: ["comunidades"],
        queryFn: () => catalogosApi.listarComunidades(),
    });

    // Con inactivos incluidos (misma consulta que useNombreCat, así que no
    // duplica la petición) y filtrado con conValorVigente: si el CAT que ya
    // tiene asignado esta productora fue dado de baja, su opción se
    // conserva en vez de dejarla sin nada asignado.
    const {
        data: centrosTodos = [], isLoading: cargandoCentros,
        isError: errorCentros, refetch: refetchCentros,
    } = useCentrosAcopio(true);
    const centros = useMemo(
        () => conValorVigente(centrosTodos, form.catAsignado || null, (c) => c.codigo, (c) => c.activo),
        [centrosTodos, form.catAsignado]);
    const nombreCat = useNombreCat();

    // Con CAT fijo (OperadorCAT) el selector ni se muestra: el servidor
    // sella su propio centro y este catálogo no interviene en el envío.
    // Capa 1 (visible): ver SelectorCatalogo.
    const catalogoInvalido = !catFijo && catalogoBloqueado(errorCentros, form.catAsignado);

    const mutation = useMutation({
        mutationFn: async () => {
            if (editando) {
                await productorasApi.actualizar(productora.id, form);
            } else {
                await productorasApi.crear(form);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["productoras"] });
            onClose();
        },
        onError: (e: unknown) => {
            // Muestra el motivo real: mensaje del backend (ej. cédula
            // duplicada) o el primer error de validación
            const err = e as {
                response?: {
                    data?: {
                        mensaje?: string;
                        errors?: Record<string, string[]>;
                    };
                };
            };
            const validacion = err.response?.data?.errors
                ? Object.values(err.response.data.errors)[0]?.[0]
                : undefined;
            setError(err.response?.data?.mensaje
                ?? validacion
                ?? "No se pudo guardar. Verifica los datos e intenta nuevamente.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        // Capa 2 (garantía): repite la condición del botón por si se llega
        // aquí sin pasar por él. Sin esto, un catálogo caído dejaría
        // guardar catAsignado: "" con solo forzar el envío del formulario.
        if (catalogoInvalido) {
            setError("Elige un centro de acopio válido antes de guardar.");
            return;
        }
        mutation.mutate();
    };

    const comunidadElegida = comunidades.find((c) => c.id === form.comunidadId);

    // Elegir comunidad ya NO toca catAsignado. La comunidad es dónde vive la
    // productora y el CAT es dónde entrega, y en el piloto no siempre
    // coinciden: CatReferencia es un dato informativo, no una restricción.
    // Derivarlo aquí sobrescribía el centro que un administrador ya tenía
    // elegido (el operador de CAT no se ve afectado: su campo está sellado
    // a catFijo y no pasa por este selector). El centro solo cambia cuando
    // alguien lo elige a mano en su propio selector.
    const elegirComunidad = (id: number) => {
        setForm({ ...form, comunidadId: id });
    };

    const field = (
        label: string,
        key: "nombreCompleto" | "cedula" | "telefono",
        type = "text",
        placeholder = "",
        disabled = false
    ) => (
        <div>
            <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                {label}
            </label>
            <input
                type={type}
                required={key !== "telefono"}
                disabled={disabled}
                value={form[key] ?? ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full h-12 px-3 rounded-xl border-2 border-gray-200 text-base
                   focus:border-primary-500 focus:outline-none transition
                   disabled:bg-gray-50 disabled:text-gray-400"
            />
        </div>
    );

    return (
        <ModalShell
            onClose={onClose}
            title={editando ? "Editar productora" : "Nueva productora"}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-productora"
                        disabled={mutation.isPending || catalogoInvalido}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Guardar productora"}
                    </button>
                </div>
            }
        >
            <form id="form-productora" onSubmit={handleSubmit} className="space-y-4">
                {field("Nombre completo", "nombreCompleto", "text", "María Chuqui Guamán")}
                    {field("Cédula", "cedula", "text", "0102030405", editando)}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Comunidad
                        </label>
                        {/* Solo del catálogo: sin texto libre no hay forma de
                            escribir "Patacocha" y partir el origen en dos */}
                        <select
                            required
                            value={form.comunidadId || ""}
                            onChange={(e) => elegirComunidad(Number(e.target.value))}
                            className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                        >
                            <option value="">Seleccionar comunidad…</option>
                            {comunidades.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre} ({c.canton})
                                </option>
                            ))}
                        </select>
                        {comunidades.length === 0 && (
                            <p className="mt-1 text-xs text-teja-700">
                                No hay comunidades en el catálogo. Crea una en
                                Administración antes de registrar productoras.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Cantón
                        </label>
                        {/* Derivado de la comunidad: se muestra para confirmar
                            la elección, pero ya no es un dato que se digite */}
                        <div className="w-full h-12 px-3 rounded-xl border-2 border-gray-100
                                bg-gray-50 text-base text-gray-500 flex items-center">
                            {comunidadElegida?.canton ?? "—"}
                        </div>
                    </div>

                    {field("Teléfono (opcional)", "telefono", "tel", "0991234567")}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Centro de acopio
                        </label>
                        {/* Al operador se le muestra fijo: el servidor sella la
                            productora con el CAT de su token e ignora lo que
                            llegue en el cuerpo, así que un desplegable editable
                            prometería una elección que no existe. */}
                        {catFijo ? (
                            <div className="w-full h-12 px-3 rounded-xl border-2 border-gray-100
                                    bg-gray-50 text-base text-gray-500 flex items-center">
                                {nombreCat(catFijo)}
                            </div>
                        ) : (
                            <SelectorCatalogo
                                label=""
                                value={form.catAsignado}
                                onChange={(v) => setForm({ ...form, catAsignado: v })}
                                cargando={cargandoCentros}
                                error={errorCentros}
                                onReintentar={() => refetchCentros()}
                                opciones={centros.map((c) => ({
                                    value: c.codigo,
                                    label: `${etiquetaCat(c)}${c.activo ? "" : " — dado de baja"}`,
                                }))}
                            />
                        )}
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
