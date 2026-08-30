import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import { ModalPasswordTemporal } from "./ModalPasswordTemporal";
import { SelectorCatalogo } from "../ui/SelectorCatalogo";
import type { Usuario } from "../../types/admin";
import type { PasswordTemporal } from "../../types/recuperacion";
import { ROLES } from "../../types/admin";
import {
    useCentrosAcopio, etiquetaCat, conValorVigente, catalogoBloqueado,
} from "../../hooks/useCatalogos";

interface Props {
    usuario: Usuario | null; // null = crear nuevo
    onClose: () => void;
}

export function FormUsuario({ usuario, onClose }: Props) {
    const qc = useQueryClient();
    const editando = usuario !== null;

    const [nombre, setNombre] = useState(usuario?.nombreCompleto ?? "");
    const [cedula, setCedula] = useState(usuario?.cedula ?? "");
    const [email, setEmail] = useState(usuario?.email ?? "");
    // Al crear, la contraseña la genera el servidor y llega en la respuesta:
    // el formulario da paso al modal que la muestra una única vez
    const [temporal, setTemporal] = useState<PasswordTemporal | null>(null);
    const [rol, setRol] = useState(usuario?.rol ?? "OperadorCAT");
    // Sin valor por defecto: el catálogo llega del API y ya no hay un
    // centro "seguro" para precargar. El selector obliga a elegir uno.
    const [catAsignado, setCatAsignado] = useState(usuario?.catAsignado ?? "");
    const [error, setError] = useState<string | null>(null);

    const esOperadorCat = rol === "OperadorCAT";

    // Con inactivos incluidos (misma consulta que useNombreCat, así que no
    // duplica la petición) y filtrado con conValorVigente: si el centro que
    // este usuario ya tiene asignado fue dado de baja, su opción se
    // conserva en vez de dejarlo sin nada asignado.
    const {
        data: centrosTodos = [], isLoading: cargandoCentros,
        isError: errorCentros, refetch: refetchCentros,
    } = useCentrosAcopio(true);
    const centros = useMemo(
        () => conValorVigente(centrosTodos, catAsignado || null, (c) => c.codigo),
        [centrosTodos, catAsignado]);

    // Solo un OperadorCAT depende de este catálogo; para el resto de roles
    // el selector ni se muestra. Capa 1 (visible): ver SelectorCatalogo.
    const catalogoInvalido = esOperadorCat && catalogoBloqueado(errorCentros, catAsignado);

    const mutation = useMutation({
        mutationFn: async () => {
            const cat = esOperadorCat ? catAsignado : undefined;
            if (editando) {
                await usuariosApi.actualizar(usuario.id, {
                    nombreCompleto: nombre,
                    email: email || undefined,
                    rol,
                    catAsignado: cat,
                });
                return null;
            }
            return await usuariosApi.crear({
                nombreCompleto: nombre, cedula,
                email: email || undefined, rol,
                catAsignado: cat,
            });
        },
        onSuccess: (creado) => {
            qc.invalidateQueries({ queryKey: ["usuarios"] });
            // Al editar se cierra sin más; al crear hay que entregar la
            // temporal antes de cerrar, o el usuario nuevo no puede entrar
            if (creado === null) {
                onClose();
                return;
            }
            setTemporal({
                passwordTemporal: creado.passwordTemporal,
                nombreCompleto: creado.usuario.nombreCompleto,
                cedula: creado.usuario.cedula,
            });
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo guardar. Verifica los datos e intenta nuevamente.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!editando && cedula.length !== 10) {
            setError("El número de cédula debe tener 10 dígitos.");
            return;
        }
        // Capa 2 (garantía): repite la condición del botón por si se llega
        // aquí sin pasar por él. Sin esto, un catálogo caído dejaría
        // guardar catAsignado: "" para un OperadorCAT con solo forzar el
        // envío del formulario.
        if (catalogoInvalido) {
            setError("Elige un centro de acopio válido antes de guardar.");
            return;
        }
        mutation.mutate();
    };

    // El usuario ya está creado: el formulario cede el sitio a la temporal.
    // Cerrar este modal cierra también el formulario — no hay nada más que
    // hacer con él. No se pasa sesionesRevocadas: una cuenta recién creada no
    // tiene sesiones abiertas que cerrar.
    if (temporal) {
        return <ModalPasswordTemporal datos={temporal} onClose={onClose} />;
    }

    return (
        <ModalShell
            onClose={onClose}
            title={editando ? "Editar usuario" : "Nuevo usuario"}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-usuario"
                        disabled={mutation.isPending || catalogoInvalido}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Guardar usuario"}
                    </button>
                </div>
            }
        >
            <form id="form-usuario" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Nombre completo
                    </label>
                    <input
                        type="text" required value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Número de cédula
                    </label>
                    <input
                        type="text" required value={cedula} disabled={editando}
                        inputMode="numeric" maxLength={10}
                        onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                        placeholder="10 dígitos, es la clave de ingreso al sistema"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none
                       disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    {editando && (
                        <p className="text-xs text-gray-400 mt-1">
                            La cédula no se puede cambiar.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Correo electrónico
                        <span className="text-gray-300 normal-case"> (opcional)</span>
                    </label>
                    <input
                        type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Solo si la persona tiene correo"
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                        text-gray-500 mb-1">
                        Rol en el sistema
                    </label>
                    <select
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                       text-base focus:border-primary-500 focus:outline-none"
                    >
                        {ROLES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* Un Operador de CAT queda restringido a su centro */}
                {esOperadorCat && (
                    <div className="animate-fade-in">
                        <SelectorCatalogo
                            label="Centro de acopio asignado"
                            value={catAsignado}
                            onChange={setCatAsignado}
                            cargando={cargandoCentros}
                            error={errorCentros}
                            onReintentar={() => refetchCentros()}
                            opciones={centros.map((c) => ({
                                value: c.codigo,
                                label: `${etiquetaCat(c)}${c.activo ? "" : " — dado de baja"}`,
                            }))}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Solo podrá registrar entregas en este centro.
                        </p>
                    </div>
                )}

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
