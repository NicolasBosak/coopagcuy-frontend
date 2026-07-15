import { useQuery } from "@tanstack/react-query";
import { reportesApi } from "../api/reportes";
import { MainLayout } from "../components/layout/MainLayout";
import { StatCard } from "../components/ui/StatCard";

export default function Dashboard() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["dashboard"],
        queryFn: () => reportesApi.dashboard(),
        refetchInterval: 60_000, // refresca cada minuto
    });

    // Un 403 es un problema de permisos del rol, no de conexión:
    // el mensaje debe orientar distinto en cada caso
    const sinPermiso = (error as { response?: { status?: number } } | null)
        ?.response?.status === 403;

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
                    {sinPermiso
                        ? "Tu rol no tiene acceso a estos indicadores. " +
                          "Avisa al administrador del sistema."
                        : "No se pudo cargar el dashboard. " +
                          "Verifica la conexión con el backend."}
                </div>
            )}

            {data && (
                <>
                    {/* KPIs principales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            label="Jaulas recibidas"
                            value={data.lotesActivos}
                            sublabel="lotes armados en los CAT"
                            color="blue"
                            delay={0}
                        />
                        <StatCard
                            label="Cuyes recibidos"
                            value={data.animalesRecibidosPeriodo}
                            sublabel="entregados por las productoras"
                            color="green"
                            delay={60}
                        />
                        <StatCard
                            label="Productoras activas"
                            value={data.totalProductoras}
                            sublabel="registradas y habilitadas"
                            color="gray"
                            delay={120}
                        />
                        <StatCard
                            label="Sesiones de faenamiento"
                            value={data.totalFaenamientos}
                            sublabel="jornadas en planta (histórico)"
                            color="gray"
                            delay={180}
                        />
                    </div>

                    {/* Calidad en recepción. Etapa explícita en el título: el
                        rechazo del CAT no es lo mismo que una devolución de
                        cliente, y mezclarlos era justo lo que confundía. */}
                    <div className="mb-2">
                        <h2 className="text-sm font-bold text-gray-700 uppercase
                             tracking-wide">
                            Calidad al recibir en el CAT
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Sobre los {data.animalesRecibidosPeriodo} cuyes revisados
                            uno por uno al entregarlos. Cada cuy cuenta por separado.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 mb-8">
                        <StatCard
                            label="Aceptados"
                            value={`${data.tasaAceptacion}%`}
                            sublabel={`${data.animalesAceptados} cuyes · cumplen peso, color y edad`}
                            color="green"
                            delay={240}
                        />
                        <StatCard
                            label="Con novedad"
                            value={`${data.tasaConNovedad}%`}
                            sublabel={`${data.animalesConNovedad} cuyes · se aceptan con observación`}
                            color="yellow"
                            delay={300}
                        />
                        <StatCard
                            label="Rechazados"
                            value={`${data.tasaRechazado}%`}
                            sublabel={`${data.animalesRechazados} cuyes · no entran a la cadena`}
                            color="red"
                            delay={360}
                        />
                    </div>

                    {/* Etapas posteriores: aquí el cuy ya fue aceptado */}
                    <div className="mb-2">
                        <h2 className="text-sm font-bold text-gray-700 uppercase
                             tracking-wide">
                            Después de la recepción
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Cuyes que sí entraron a la cadena y se devolvieron más
                            tarde. No cuentan como rechazo del CAT.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 mb-8">
                        <StatCard
                            label="Retornos desde planta"
                            value={data.retornosDesdePlanta}
                            sublabel="cuyes que la planta halló no aptos y devolvió a su productora"
                            color="yellow"
                            delay={420}
                        />
                        <StatCard
                            label="Devoluciones de clientes"
                            value={data.unidadesDevueltas}
                            sublabel={`unidades en ${data.devolucionesClientes} ${data.devolucionesClientes === 1
                                ? "devolución" : "devoluciones"} tras el despacho`}
                            color="red"
                            delay={480}
                        />
                    </div>

                    {/* QR */}
                    <div className="bg-primary-50 border border-primary-200
                          rounded-xl p-5 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-primary-800">
                                Lotes con código QR generado
                            </p>
                            <p className="text-xs text-primary-600 mt-0.5">
                                Productos que el consumidor final puede rastrear
                                hasta su comunidad de origen
                            </p>
                        </div>
                        <span className="text-3xl font-semibold text-primary-700 shrink-0">
                            {data.lotesConQR}
                        </span>
                    </div>
                </>
            )}
        </MainLayout>
    );
}