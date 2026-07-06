import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faenamientoApi } from "../../api/faenamiento";
import { useAuth } from "../../context/AuthContext";
import { ModalShell } from "../ui/ModalShell";

interface Props {
    onClose: () => void;
}

// Registro de devolución de cliente — RF-307. La devolución nace de un
// despacho concreto: se elige el envío que el cliente devuelve y el
// cliente se autocompleta desde él (ya se registró al despachar). Solo
// aparecen despachos con unidades sin devolver.
export function FormDevolucion({ onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const hoy = new Date().toISOString().slice(0, 16);

    const [despachoId, setDespachoId] = useState(0);
    const [fechaDevolucion, setFechaDevolucion] = useState(hoy);
    const [cantidadUnidades, setCantidadUnidades] = useState(1);
    const [motivo, setMotivo] = useState("");
    const [responsable, setResponsable] = useState(auth.nombreCompleto ?? "");
    const [observaciones, setObservaciones] = useState("");
    const [error, setError] = useState<string | null>(null);

    const { data: despachos = [], isLoading } = useQuery({
        queryKey: ["despachos"],
        queryFn: () => faenamientoApi.listarDespachos(),
    });

    // Solo despachos con unidades pendientes de devolver
    const devolvibles = despachos.filter(
        (d) => d.cantidadUnidades - d.unidadesDevueltas > 0);

    const despachoElegido = devolvibles.find((d) => d.id === despachoId);
    const restante = despachoElegido
        ? despachoElegido.cantidadUnidades - despachoElegido.unidadesDevueltas
        : 0;

    const etiquetaDespacho = (d: (typeof despachos)[number]) => {
        const codigo = d.codigoLoteFaenado ?? d.codigoLote ?? "—";
        const rest = d.cantidadUnidades - d.unidadesDevueltas;
        return `${codigo} · ${d.clienteDestino} · `
            + `${new Date(d.fechaDespacho).toLocaleDateString("es-EC")} · `
            + `${rest} de ${d.cantidadUnidades} sin devolver`;
    };

    const mutation = useMutation({
        mutationFn: () => faenamientoApi.registrarDevolucion({
            despachoId,
            fechaDevolucion,
            cantidadUnidades,
            motivo,
            responsable,
            observaciones: observaciones || undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["devoluciones"] });
            qc.invalidateQueries({ queryKey: ["despachos"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo registrar la devolución.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!despachoElegido) {
            setError("Selecciona el despacho que el cliente devuelve.");
            return;
        }
        mutation.mutate();
    };

    return (
        <ModalShell
            onClose={onClose}
            title="Registrar devolución"
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-devolucion"
                        disabled={mutation.isPending}
                        className="flex-1 h-12 bg-teja-500 hover:bg-teja-600
                       disabled:bg-teja-100 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending ? "Guardando…" : "Registrar devolución"}
                    </button>
                </div>
            }
        >
            <form id="form-devolucion" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Despacho que devuelve el cliente
                    </label>
                    <select
                        required
                        value={despachoId}
                        onChange={(e) => {
                            setDespachoId(Number(e.target.value));
                            setCantidadUnidades(1);
                        }}
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                    >
                        <option value={0}>
                            {isLoading
                                ? "Cargando despachos…"
                                : devolvibles.length === 0
                                    ? "No hay despachos con unidades por devolver"
                                    : "Seleccionar despacho…"}
                        </option>
                        {devolvibles.map((d) => (
                            <option key={d.id} value={d.id}>
                                {etiquetaDespacho(d)}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                        Solo se devuelve producto ya enviado. Los animales
                        devueltos vivos antes del faenamiento se registran
                        como retorno a la productora.
                    </p>
                </div>

                {/* Cliente derivado del despacho: no se vuelve a digitar */}
                {despachoElegido && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl
                        px-3 py-2.5 animate-fade-in">
                        <p className="text-xs font-bold uppercase tracking-wide
                           text-gray-500">
                            Cliente que devuelve
                        </p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">
                            {despachoElegido.clienteDestino}
                        </p>
                        <p className="text-xs text-gray-400">
                            Registrado al momento del despacho
                            {despachoElegido.transporte &&
                                ` · ${despachoElegido.transporte}`}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Fecha
                        </label>
                        <input
                            type="datetime-local" required
                            value={fechaDevolucion}
                            onChange={(e) => setFechaDevolucion(e.target.value)}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Unidades
                        </label>
                        <input
                            type="number" min={1} required
                            max={restante > 0 ? restante : undefined}
                            value={cantidadUnidades}
                            onChange={(e) =>
                                setCantidadUnidades(Number(e.target.value))}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                        />
                        {despachoElegido && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                Quedan {restante} sin devolver de{" "}
                                {despachoElegido.cantidadUnidades} enviadas
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Motivo de la devolución
                    </label>
                    <input
                        type="text" required
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Por ejemplo: carne dura, animal viejo"
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Responsable del registro
                    </label>
                    <input
                        type="text" required
                        value={responsable}
                        onChange={(e) => setResponsable(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Observaciones <span className="text-gray-300 normal-case">(opcional)</span>
                    </label>
                    <textarea
                        rows={2}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Notas de la devolución"
                        className="w-full px-3 py-2 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none resize-none"
                    />
                </div>

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
