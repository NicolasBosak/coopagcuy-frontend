import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosApi } from "../../api/admin";
import { recuperacionApi } from "../../api/recuperacion";
import { Badge } from "../ui/Badge";
import { FormUsuario } from "./FormUsuario";
import { ModalPasswordTemporal } from "./ModalPasswordTemporal";
import { useAuth } from "../../context/useAuth";
import type { Usuario } from "../../types/admin";
import type { PasswordTemporal } from "../../types/recuperacion";
import { ROLES } from "../../types/admin";
import { CENTROS_ACOPIO } from "../../types/productora";

export function TablaUsuarios() {
    const qc = useQueryClient();
    const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);
    const { auth } = useAuth();
    const [temporal, setTemporal] = useState<PasswordTemporal | null>(null);

    const { data: usuarios = [], isLoading } = useQuery({
        queryKey: ["usuarios"],
        queryFn: () => usuariosApi.listar(true),
    });

    const toggle = useMutation({
        mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
            usuariosApi.cambiarEstado(id, activo),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setAviso(err.response?.data?.mensaje
                ?? "No se pudo cambiar el estado del usuario.");
        },
    });

    const restablecer = useMutation({
        mutationFn: (id: number) => recuperacionApi.restablecerPorUsuario(id),
        onSuccess: (datos) => setTemporal(datos),
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setAviso(err.response?.data?.mensaje
                ?? "No se pudo restablecer la contraseña.");
        },
    });

    const nombreRol = (rol: string) =>
        ROLES.find((r) => r.value === rol)?.label ?? rol;

    const nombreCat = (cat: string) =>
        CENTROS_ACOPIO.find((c) => c.value === cat)?.label ?? cat;

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => { setUsuarioEditar(null); setShowForm(true); }}
                    className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-semibold rounded-xl transition
                     active:scale-[0.98]"
                >
                    + Nuevo usuario
                </button>
            </div>

            {aviso && (
                <div className="bg-teja-50 border border-teja-100 rounded-xl px-4 py-3
                        text-sm text-teja-700 mb-4 flex items-center justify-between">
                    {aviso}
                    <button onClick={() => setAviso(null)}
                        className="text-teja-500 font-bold ml-4">✕</button>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto
                      animate-fade-in-up">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                        Cargando usuarios…
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Nombre", "Cédula", "Rol", "CAT", "Estado", ""].map((h) => (
                                    <th key={h}
                                        className="px-4 py-3 text-left text-xs font-bold
                                 text-gray-500 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usuarios.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {u.nombreCompleto}
                                        {u.email && (
                                            <span className="block text-xs font-normal
                                                   text-gray-400">
                                                {u.email}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                        {u.cedula}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {nombreRol(u.rol)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {u.catAsignado ? nombreCat(u.catAsignado) : "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            label={u.activo ? "Activo" : "Inactivo"}
                                            variant={u.activo ? "success" : "danger"}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                setUsuarioEditar(u);
                                                setShowForm(true);
                                            }}
                                            className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800"
                                        >
                                            Editar
                                        </button>
                                        {/* Oculto en usuarios inactivos y en la
                                            fila del propio administrador: el
                                            servidor rechaza ambos con 409, y un
                                            botón que siempre falla es peor que
                                            un botón ausente */}
                                        {u.activo && u.cedula !== auth.cedula && (
                                            <button
                                                disabled={restablecer.isPending}
                                                onClick={() => restablecer.mutate(u.id)}
                                                className="text-xs font-semibold
                                   text-primary-600 hover:text-primary-800
                                   disabled:text-gray-300"
                                            >
                                                Restablecer
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggle.mutate({
                                                id: u.id, activo: !u.activo
                                            })}
                                            className={`text-xs font-semibold
                                    ${u.activo
                                                    ? "text-teja-500 hover:text-teja-700"
                                                    : "text-primary-600 hover:text-primary-800"}`}
                                        >
                                            {u.activo ? "Desactivar" : "Activar"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && (
                <FormUsuario
                    usuario={usuarioEditar}
                    onClose={() => setShowForm(false)}
                />
            )}

            {temporal && (
                <ModalPasswordTemporal
                    datos={temporal}
                    onClose={() => setTemporal(null)}
                    sesionesRevocadas
                />
            )}
        </>
    );
}
