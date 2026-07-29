import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type SesionActiva } from "../api/auth";
import { MainLayout } from "../components/layout/MainLayout";
import { Badge } from "../components/ui/Badge";

const NOMBRE_ROL: Record<string, string> = {
    OperadorCAT: "Operador de CAT",
    OperadorFaenamiento: "Operador de faenamiento",
    AdminCooperativa: "Admin. cooperativa",
    AdminTecnico: "Admin. técnico",
};

function fecha(iso: string): string {
    return new Date(iso).toLocaleString("es-EC", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function Sesiones() {
    const qc = useQueryClient();

    const { data = [], isLoading, isError } = useQuery({
        queryKey: ["sesiones"],
        queryFn: () => authApi.listarSesiones(),
    });

    const revocar = useMutation({
        mutationFn: (id: number) => authApi.revocarSesion(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["sesiones"] }),
    });

    const confirmarRevocar = (s: SesionActiva) => {
        const quien = `${s.nombreUsuario} (${s.cedula})`;
        if (window.confirm(
            `¿Cerrar la sesión de ${quien}? El dispositivo perderá el acceso ` +
            "y deberá iniciar sesión de nuevo.")) {
            revocar.mutate(s.id);
        }
    };

    return (
        <MainLayout>
            <header className="mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                    Sesiones activas
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Dispositivos con sesión abierta (válida por 7 días). Revoca el
                    acceso de una tablet perdida o de un usuario que ya no opera.
                </p>
            </header>

            {isLoading && (
                <p className="text-sm text-gray-400 py-10 text-center">
                    Cargando sesiones…
                </p>
            )}

            {isError && (
                <div className="bg-teja-50 border border-teja-200 rounded-xl
                    px-4 py-3 text-sm text-teja-700">
                    No se pudieron cargar las sesiones. Revisa tu conexión.
                </div>
            )}

            {!isLoading && !isError && data.length === 0 && (
                <p className="text-sm text-gray-400 py-10 text-center">
                    No hay sesiones activas en este momento.
                </p>
            )}

            {data.length > 0 && (
                <div className="space-y-2">
                    {data.map((s) => (
                        <div key={s.id}
                            className="bg-white rounded-2xl border border-gray-200
                                px-4 py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 truncate">
                                        {s.nombreUsuario}
                                    </p>
                                    {s.esSesionActual && (
                                        <Badge label="Esta tablet" variant="info" />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {NOMBRE_ROL[s.rol] ?? s.rol}
                                    {s.catAsignado ? ` · ${s.catAsignado}` : ""}
                                    {" · "}cédula {s.cedula}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Último uso: {fecha(s.fechaUltimoUso)}
                                    {" · "}expira {fecha(s.fechaExpiracion)}
                                </p>
                            </div>
                            <button
                                onClick={() => confirmarRevocar(s)}
                                disabled={revocar.isPending}
                                className="shrink-0 min-h-[44px] px-4 text-xs font-bold
                                    text-teja-600 hover:text-teja-800 hover:bg-teja-50
                                    rounded-lg transition disabled:opacity-50"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </MainLayout>
    );
}
