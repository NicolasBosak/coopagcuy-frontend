import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recuperacionApi } from "../../api/recuperacion";
import { ModalPasswordTemporal } from "./ModalPasswordTemporal";
import { Badge } from "../ui/Badge";
import type { PasswordTemporal } from "../../types/recuperacion";
import { ROLES } from "../../types/admin";

/**
 * El API serializa sus fechas SIN sufijo de zona ("2026-08-14T18:43:30"):
 * Npgsql las entrega con Kind=Unspecified y System.Text.Json no les añade
 * marca. JavaScript interpreta un ISO sin zona como hora LOCAL, así que en
 * Ecuador (UTC-5) una fecha guardada en UTC se lee cinco horas en el futuro.
 *
 * En las pantallas que solo muestran la fecha eso pasa por una hora rara; en
 * un cálculo de antigüedad la resta sale NEGATIVA y toda solicitud aparenta
 * ser de "hace 0 min". Por eso se marca como UTC explícitamente, que es lo
 * que el servidor guardó.
 */
function comoUtc(iso: string): number {
    const tieneZona = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso);
    return Date.parse(tieneZona ? iso : `${iso}Z`);
}

// "hace 3 horas" pesa más que una fecha absoluta para decidir a quién llamar
// primero: lo que importa es cuánto lleva esperando ese operador.
function antiguedad(iso: string): string {
    // El tope inferior es solo por desfase de reloj entre servidor y tablet,
    // no para tapar un error de zona horaria: de eso se ocupa comoUtc.
    const minutos = Math.max(0,
        Math.floor((Date.now() - comoUtc(iso)) / 60_000));
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

export function SolicitudesPassword() {
    const qc = useQueryClient();
    const [verHistorial, setVerHistorial] = useState(false);
    const [temporal, setTemporal] = useState<PasswordTemporal | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    const { data: solicitudes = [], isLoading } = useQuery({
        queryKey: ["solicitudes-password", verHistorial],
        queryFn: () => recuperacionApi.listar(verHistorial),
    });

    const invalidar = () =>
        qc.invalidateQueries({ queryKey: ["solicitudes-password"] });

    const mensajeError = (e: unknown, porDefecto: string) => {
        const err = e as { response?: { data?: { mensaje?: string } } };
        setAviso(err.response?.data?.mensaje ?? porDefecto);
    };

    const resolver = useMutation({
        mutationFn: (id: number) => recuperacionApi.resolver(id),
        onSuccess: (datos) => {
            setTemporal(datos);
            invalidar();
        },
        onError: (e) => mensajeError(e,
            "No se pudo restablecer la contraseña. Actualiza la pantalla."),
    });

    const descartar = useMutation({
        mutationFn: (id: number) => recuperacionApi.descartar(id),
        onSuccess: invalidar,
        onError: (e) => mensajeError(e, "No se pudo descartar la solicitud."),
    });

    const nombreRol = (rol: string) =>
        ROLES.find((r) => r.value === rol)?.label ?? rol;

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={verHistorial}
                        onChange={(e) => setVerHistorial(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300
                       text-primary-600 focus:ring-primary-500" />
                    Ver también las ya atendidas
                </label>
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
                        Cargando solicitudes…
                    </div>
                ) : solicitudes.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-sm font-medium text-gray-600">
                            No hay solicitudes pendientes
                        </p>
                        <p className="text-xs text-gray-400 mt-1.5">
                            Aquí aparecerán los usuarios que pidan una
                            contraseña nueva desde la pantalla de ingreso.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {["Usuario", "Cédula", "Rol", "Origen", "Solicitada", "Estado", ""]
                                    .map((h) => (
                                        <th key={h}
                                            className="px-4 py-3 text-left text-xs font-bold
                                     text-gray-500 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {solicitudes.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {s.nombreCompleto}
                                        {!s.usuarioActivo && (
                                            <span className="block text-xs font-normal
                                                   text-teja-600">
                                                Usuario desactivado
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                        {s.cedula}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {nombreRol(s.rol)}
                                    </td>
                                    {/* En palabras y no con el valor crudo del
                                        enum: lo que importa al leer la bandeja
                                        es quién dio el primer paso, no cómo se
                                        llama el campo en la base */}
                                    <td className="px-4 py-3 text-gray-600">
                                        {s.origen === "Administrador"
                                            ? "Iniciado por el admin."
                                            : "Lo pidió el usuario"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {antiguedad(s.fechaCreacion)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            label={s.estado}
                                            variant={s.estado === "Pendiente" ? "warning"
                                                : s.estado === "Resuelta" ? "success"
                                                    : "neutral"}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                                        {s.estado === "Pendiente" ? (
                                            <>
                                                <button
                                                    disabled={resolver.isPending}
                                                    onClick={() => resolver.mutate(s.id)}
                                                    className="text-xs font-semibold
                                       text-primary-600 hover:text-primary-800
                                       disabled:text-gray-300"
                                                >
                                                    Restablecer
                                                </button>
                                                <button
                                                    disabled={descartar.isPending}
                                                    onClick={() => descartar.mutate(s.id)}
                                                    className="text-xs font-semibold
                                       text-teja-500 hover:text-teja-700
                                       disabled:text-gray-300"
                                                >
                                                    Descartar
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400">
                                                {s.resueltaPor
                                                    ? `por ${s.resueltaPor}` : "—"}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

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
