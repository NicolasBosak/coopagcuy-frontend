import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productorasApi } from "../../api/productoras";
import { catalogosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import { useAuth } from "../../context/useAuth";
import type { CrearProductoraRequest, Productora } from "../../types/productora";
import { useCentrosAcopio, useNombreCat, etiquetaCat } from "../../hooks/useCatalogos";

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

    const { data: centros = [], isLoading: cargandoCentros } = useCentrosAcopio();
    const nombreCat = useNombreCat();

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
                        disabled={mutation.isPending}
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
                            <select
                                required
                                value={form.catAsignado}
                                onChange={(e) => setForm({ ...form, catAsignado: e.target.value })}
                                className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                             text-base focus:border-primary-500 focus:outline-none"
                            >
                                <option value="" disabled>
                                    {cargandoCentros ? "Cargando centros…" : "Seleccionar centro…"}
                                </option>
                                {centros.map((c) => (
                                    <option key={c.codigo} value={c.codigo}>{etiquetaCat(c)}</option>
                                ))}
                            </select>
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
