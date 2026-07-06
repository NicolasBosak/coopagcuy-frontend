import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosApi, catalogosApi } from "../api/admin";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";
import { FormUsuario } from "../components/admin/FormUsuario";
import { FormComunidad } from "../components/admin/FormComunidad";
import type { Usuario, Comunidad } from "../types/admin";
import { ROLES } from "../types/admin";
import { CENTROS_ACOPIO } from "../types/productora";

type Tab = "usuarios" | "comunidades";

export default function Administracion() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("usuarios");
    const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
    const [comunidadEditar, setComunidadEditar] = useState<Comunidad | null>(null);
    const [showFormUsuario, setShowFormUsuario] = useState(false);
    const [showFormComunidad, setShowFormComunidad] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);

    const { data: usuarios = [], isLoading: cargandoUsuarios } = useQuery({
        queryKey: ["usuarios"],
        queryFn: () => usuariosApi.listar(true),
        enabled: tab === "usuarios",
    });

    const { data: comunidades = [], isLoading: cargandoComunidades } = useQuery({
        queryKey: ["comunidades", "admin"],
        queryFn: () => catalogosApi.listarComunidades(true),
        enabled: tab === "comunidades",
    });

    const toggleUsuario = useMutation({
        mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
            usuariosApi.cambiarEstado(id, activo),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setAviso(err.response?.data?.mensaje
                ?? "No se pudo cambiar el estado del usuario.");
        },
    });

    const toggleComunidad = useMutation({
        mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
            catalogosApi.cambiarEstadoComunidad(id, activa),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["comunidades"] }),
    });

    const nombreRol = (rol: string) =>
        ROLES.find((r) => r.value === rol)?.label ?? rol;

    const nombreCat = (cat: string) =>
        CENTROS_ACOPIO.find((c) => c.value === cat)?.label ?? cat;

    return (
        <MainLayout>
            <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        Administración
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Usuarios del sistema y catálogo de comunidades
                    </p>
                </div>
                <button
                    onClick={() => tab === "usuarios"
                        ? (setUsuarioEditar(null), setShowFormUsuario(true))
                        : (setComunidadEditar(null), setShowFormComunidad(true))}
                    className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-semibold rounded-xl transition
                     active:scale-[0.98]"
                >
                    {tab === "usuarios" ? "+ Nuevo usuario" : "+ Nueva comunidad"}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit">
                {([
                    { id: "usuarios", label: "Usuarios" },
                    { id: "comunidades", label: "Comunidades" },
                ] as const).map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`px-5 h-10 rounded-lg text-sm font-semibold transition
              ${tab === id
                                ? "bg-primary-600 text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-800"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {aviso && (
                <div className="bg-teja-50 border border-teja-100 rounded-xl px-4 py-3
                        text-sm text-teja-700 mb-4 flex items-center justify-between">
                    {aviso}
                    <button onClick={() => setAviso(null)}
                        className="text-teja-500 font-bold ml-4">✕</button>
                </div>
            )}

            {/* ── Tab usuarios — RF-504 ── */}
            {tab === "usuarios" && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto
                        animate-fade-in-up">
                    {cargandoUsuarios ? (
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
                                            {u.catAsignado
                                                ? nombreCat(u.catAsignado)
                                                : "—"}
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
                                                    setShowFormUsuario(true);
                                                }}
                                                className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => toggleUsuario.mutate({
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
            )}

            {/* ── Tab comunidades — RF-506 ── */}
            {tab === "comunidades" && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto
                        animate-fade-in-up">
                    {cargandoComunidades ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            Cargando comunidades…
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Comunidad", "Cantón", "CAT de referencia", "Estado", ""].map((h) => (
                                        <th key={h}
                                            className="px-4 py-3 text-left text-xs font-bold
                                 text-gray-500 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {comunidades.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {c.nombre}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{c.canton}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {nombreCat(c.catReferencia)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                label={c.activa ? "Activa" : "Inactiva"}
                                                variant={c.activa ? "success" : "danger"}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setComunidadEditar(c);
                                                    setShowFormComunidad(true);
                                                }}
                                                className="text-xs font-semibold text-primary-600
                                   hover:text-primary-800"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => toggleComunidad.mutate({
                                                    id: c.id, activa: !c.activa
                                                })}
                                                className={`text-xs font-semibold
                                    ${c.activa
                                                        ? "text-teja-500 hover:text-teja-700"
                                                        : "text-primary-600 hover:text-primary-800"}`}
                                            >
                                                {c.activa ? "Desactivar" : "Activar"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {showFormUsuario && (
                <FormUsuario
                    usuario={usuarioEditar}
                    onClose={() => setShowFormUsuario(false)}
                />
            )}
            {showFormComunidad && (
                <FormComunidad
                    comunidad={comunidadEditar}
                    onClose={() => setShowFormComunidad(false)}
                />
            )}
        </MainLayout>
    );
}
