import { useQuery } from "@tanstack/react-query";
import { reportesApi } from "../api/reportes";
import { MainLayout } from "../components/layout/MainLayout";
import { StatCard } from "../components/ui/StatCard";

export default function Dashboard() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["dashboard"],
        queryFn: () => reportesApi.dashboard(),
        refetchInterval: 60_000, // refresca cada minuto
    });

    return (
        <MainLayout>
            <div className="mb-8 textura-campo rounded-3xl px-6 py-6 -mx-2">
                <p className="text-[11px] font-bold uppercase tracking-widest
                      text-primary-700 mb-1">
                    Coopagcuy · Azuay
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                    Panel principal
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Resumen de operaciones — últimos 30 días
                </p>
            </div>

            {isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4
                        text-red-700 text-sm">
                    No se pudo cargar el dashboard. Verifica la conexión con el backend.
                </div>
            )}

            {data && (
                <>
                    {/* KPIs principales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            label="Lotes recibidos"
                            value={data.lotesActivos}
                            color="blue"
                            delay={0}
                        />
                        <StatCard
                            label="Animales recibidos"
                            value={data.animalesRecibidosPeriodo}
                            sublabel="en el período"
                            color="green"
                            delay={60}
                        />
                        <StatCard
                            label="Productoras activas"
                            value={data.totalProductoras}
                            color="gray"
                            delay={120}
                        />
                        <StatCard
                            label="Faenamientos"
                            value={data.totalFaenamientos}
                            color="gray"
                            delay={180}
                        />
                    </div>

                    {/* Tasas de calidad */}
                    <h2 className="text-sm font-medium text-gray-500 uppercase
                         tracking-wide mb-3">
                        Tasas de calidad
                    </h2>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <StatCard
                            label="Tasa de aceptación"
                            value={`${data.tasaAceptacion}%`}
                            color="green"
                            delay={240}
                        />
                        <StatCard
                            label="Con novedad"
                            value={`${data.tasaConNovedad}%`}
                            color="yellow"
                            delay={300}
                        />
                        <StatCard
                            label="Rechazados"
                            value={`${data.tasaRechazado}%`}
                            color="red"
                            delay={360}
                        />
                    </div>

                    {/* QR */}
                    <div className="bg-primary-50 border border-primary-200
                          rounded-xl p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-primary-800">
                                Lotes con código QR generado
                            </p>
                            <p className="text-xs text-primary-600 mt-0.5">
                                Productos trazables para el consumidor final
                            </p>
                        </div>
                        <span className="text-3xl font-semibold text-primary-700">
                            {data.lotesConQR}
                        </span>
                    </div>
                </>
            )}
        </MainLayout>
    );
}