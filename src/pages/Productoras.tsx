import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productorasApi } from "../api/productoras";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";
import { FormProductora } from "../components/productoras/FormProductora";
import { useAuth } from "../context/AuthContext";
import { CENTROS_ACOPIO, type CentroAcopio, type Productora } from "../types/productora";

export default function Productoras() {
    const { auth } = useAuth();
    const qc = useQueryClient();
    const esAdmin = auth.rol === "AdminCooperativa" || auth.rol === "AdminTecnico";
    // El operador de CAT solo ve su centro; el backend ya lo fuerza
    const catFijo = auth.rol === "OperadorCAT" ? auth.catAsignado : null;

    const [showForm, setShowForm] = useState(false);
    const [productoraEditar, setProductoraEditar] = useState<Productora | null>(null);
    const [filtroCat, setFiltroCat] = useState<CentroAcopio | "">("");
    const [filtroBusq, setFiltroBusq] = useState("");

    const { data = [], isLoading } = useQuery({
        queryKey: ["productoras", filtroCat, esAdmin],
        // El admin ve también las inactivas para poder reactivarlas
        queryFn: () => productorasApi.listar({
            cat: filtroCat || undefined,
            incluirInactivas: esAdmin,
        }),
    });

    const toggleEstado = useMutation({
        mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
            productorasApi.cambiarEstado(id, activa),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["productoras"] }),
    });

    const filtradas = data.filter((p) =>
        p.nombreCompleto.toLowerCase().includes(filtroBusq.toLowerCase()) ||
        p.cedula.includes(filtroBusq) ||
        p.comunidad.toLowerCase().includes(filtroBusq.toLowerCase())
    );

    return (
        <MainLayout>
            {/* Encabezado */}
            <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">Productoras</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {data.length} registradas en el sistema
                    </p>
                </div>
                {esAdmin && (
                    <button
                        onClick={() => { setProductoraEditar(null); setShowForm(true); }}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 shrink-0
                     bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-medium rounded-lg transition"
                    >
                        + Nueva productora
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="flex flex-col xs:flex-row gap-3 mb-5">
                <input
                    type="text"
                    placeholder="Buscar por nombre, cédula o comunidad..."
                    value={filtroBusq}
                    onChange={(e) => setFiltroBusq(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg
                     text-sm focus:outline-none focus:ring-2
                     focus:ring-primary-500 transition"
                />
                {catFijo ? (
                    <span className="inline-flex items-center px-3 py-2 rounded-lg
                         bg-primary-50 text-primary-800 text-sm font-semibold">
                        {CENTROS_ACOPIO.find((c) => c.value === catFijo)?.label ?? catFijo}
                    </span>
                ) : (
                    <select
                        value={filtroCat}
                        onChange={(e) => setFiltroCat(e.target.value as CentroAcopio | "")}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Todos los CAT</option>
                        {CENTROS_ACOPIO.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                        Cargando productoras...
                    </div>
                ) : filtradas.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                        No se encontraron productoras con ese criterio.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Nombre", "Cédula", "Comunidad", "CAT", "Teléfono",
                                    "Retornos", "Estado", ""].map(h => (
                                    <th key={h}
                                        className="px-4 py-3 text-left text-xs font-medium
                               text-gray-500 uppercase tracking-wide">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtradas.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {p.nombreCompleto}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{p.cedula}</td>
                                    <td className="px-4 py-3 text-gray-600">{p.comunidad}</td>
                                    <td className="px-4 py-3">
                                        <Badge label={p.catAsignado} variant="neutral" />
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {p.telefono ?? "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {p.totalRetornos > 0 ? (
                                            <span
                                                title={`${p.totalRetornos} cuy(es) retornado(s) desde la planta por no aptos`}
                                                className="inline-flex items-center gap-1 px-2 py-0.5
                                   rounded-full bg-teja-50 text-teja-600
                                   text-xs font-bold"
                                            >
                                                ⚠ {p.totalRetornos}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            label={p.activa ? "Activa" : "Inactiva"}
                                            variant={p.activa ? "success" : "danger"}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                        {esAdmin && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setProductoraEditar(p);
                                                        setShowForm(true);
                                                    }}
                                                    className="text-xs font-semibold text-primary-600
                                       hover:text-primary-800"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => toggleEstado.mutate({
                                                        id: p.id, activa: !p.activa,
                                                    })}
                                                    className={`text-xs font-semibold
                                        ${p.activa
                                                            ? "text-teja-500 hover:text-teja-700"
                                                            : "text-primary-600 hover:text-primary-800"}`}
                                                >
                                                    {p.activa ? "Desactivar" : "Activar"}
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modales */}
            {showForm && (
                <FormProductora
                    productora={productoraEditar}
                    onClose={() => setShowForm(false)}
                />
            )}
        </MainLayout>
    );
}