import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosApi } from "../../api/admin";
import { ModalShell } from "../ui/ModalShell";
import type { Usuario } from "../../types/admin";
import { ROLES } from "../../types/admin";
import { CENTROS_ACOPIO } from "../../types/productora";

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
    const [password, setPassword] = useState("");
    const [rol, setRol] = useState(usuario?.rol ?? "OperadorCAT");
    const [catAsignado, setCatAsignado] = useState(usuario?.catAsignado ?? "PAT");
    const [error, setError] = useState<string | null>(null);

    const esOperadorCat = rol === "OperadorCAT";

    const mutation = useMutation({
        mutationFn: async () => {
            const cat = esOperadorCat ? catAsignado : undefined;
            if (editando) {
                await usuariosApi.actualizar(usuario.id, {
                    nombreCompleto: nombre,
                    email: email || undefined,
                    rol,
                    catAsignado: cat,
                    nuevaPassword: password || undefined,
                });
            } else {
                await usuariosApi.crear({
                    nombreCompleto: nombre, cedula,
                    email: email || undefined, password, rol,
                    catAsignado: cat,
                });
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["usuarios"] });
            onClose();
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
        if (!editando && password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres, con una letra y un número.");
            return;
        }
        mutation.mutate();
    };

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
                        disabled={mutation.isPending}
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
                        {editando ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
                    </label>
                    <input
                        type="password"
                        required={!editando}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres, con letra y número"
                        autoComplete="new-password"
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
                        <label className="block text-xs font-bold uppercase tracking-wide
                          text-gray-500 mb-1">
                            Centro de acopio asignado
                        </label>
                        <select
                            value={catAsignado}
                            onChange={(e) => setCatAsignado(e.target.value)}
                            className="w-full h-12 px-3 rounded-xl border-2 border-gray-200
                           text-base focus:border-primary-500 focus:outline-none"
                        >
                            {CENTROS_ACOPIO.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
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
