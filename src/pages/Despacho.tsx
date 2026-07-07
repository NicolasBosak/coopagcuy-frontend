import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { faenamientoApi } from "../api/faenamiento";
import { MainLayout } from "../components/layout/MainLayout";
import { FormDespacho } from "../components/faenamiento/FormDespacho";

export default function Despacho() {
    const [showForm, setShowForm] = useState(false);

    const { data: despachos = [], isLoading } = useQuery({
        queryKey: ["despachos"],
        queryFn: () => faenamientoApi.listarDespachos(),
    });

    return (
        <MainLayout>
            <div className="flex flex-col gap-3 xs:flex-row xs:items-center
                      xs:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        Despacho
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Comercialización del producto terminado
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="h-11 px-5 bg-primary-600 hover:bg-primary-700
                     text-white text-sm font-semibold rounded-xl transition
                     active:scale-[0.98]"
                >
                    + Registrar despacho
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto
                      animate-fade-in-up">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                        Cargando despachos…
                    </div>
                ) : despachos.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400">
                        No hay despachos registrados aún.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Lote faenado", "Cliente destino", "Fecha",
                                    "Unidades", "Responsable", "Chofer / Ruta"].map(h => (
                                        <th key={h}
                                            className="px-4 py-3 text-left text-xs font-bold
                                 text-gray-500 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {despachos.map((d) => (
                                <tr key={d.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-mono text-xs font-bold
                                     text-primary-800">
                                        {d.codigoLoteFaenado ?? d.codigoLote ?? "—"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {d.clienteDestino}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {new Date(d.fechaDespacho).toLocaleString("es-EC")}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600"
                                        title={d.cuyes.map(c =>
                                            `${c.codigoJaula} #${c.numeroEnLote}`)
                                            .join(", ")}>
                                        {d.cantidadUnidades}
                                        {d.cuyes.length > 0 && (
                                            <span className="block text-[10px] text-gray-400">
                                                {d.cuyes.map(c => `#${c.numeroEnLote}`)
                                                    .join(" ")}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {d.responsable}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {d.chofer || d.ruta ? (
                                            <>
                                                {d.chofer ?? "—"}
                                                {d.ruta && (
                                                    <span className="block text-xs text-gray-400">
                                                        {d.ruta}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && <FormDespacho onClose={() => setShowForm(false)} />}
        </MainLayout>
    );
}
