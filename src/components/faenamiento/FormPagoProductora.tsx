import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pagosApi } from "../../api/pagos";
import { useAuth } from "../../context/useAuth";
import { ModalShell } from "../ui/ModalShell";
import { EvidenciaNovedad } from "../ui/EvidenciaNovedad";
import type { TicketPorPagar, DescuentoRequest } from "../../types/productora";

interface Props {
    ticket: TicketPorPagar;
    onClose: () => void;
}

const MAX_BYTES_COMPROBANTE = 2 * 1024 * 1024;

/**
 * Registro de la transferencia por la planta.
 *
 * Los descuentos solo pueden apoyarse en un cuy que el CAT marcó: por eso la
 * lista no es libre, sale del servidor. El total se recalcula a la vista, y
 * el servidor lo vuelve a calcular al guardar sin fiarse de esta pantalla.
 */
export function FormPagoProductora({ ticket, onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();

    // Descuento por novedad, indexado por novedadId. Vacío = sin descuento.
    const [descuentos, setDescuentos] = useState<
        Record<number, { descripcion: string; montoUsd: number }>>({});
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: cuyes = [], isLoading } = useQuery({
        queryKey: ["cuyes_con_novedad", ticket.pagoId],
        queryFn: () => pagosApi.cuyesConNovedad(ticket.pagoId),
    });

    const aplicados: DescuentoRequest[] = Object.entries(descuentos)
        .filter(([, d]) => d.montoUsd > 0)
        .map(([novedadId, d]) => ({
            novedadCatId: Number(novedadId),
            descripcion: d.descripcion,
            montoUsd: d.montoUsd,
        }));

    const totalDescuento = aplicados.reduce((s, d) => s + d.montoUsd, 0);
    const aPagar = ticket.montoUsd - totalDescuento;

    const mutation = useMutation({
        mutationFn: () => pagosApi.pagar(ticket.pagoId, {
            descuentos: aplicados,
            comprobanteBase64: comprobante ?? "",
            pagadoPor: auth.nombreCompleto ?? "",
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tickets_por_pagar"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje ?? "No se pudo registrar el pago.");
        },
    });

    const leerComprobante = (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;

        if (archivo.size > MAX_BYTES_COMPROBANTE) {
            setError(`La captura pesa ${Math.round(archivo.size / 1024)} KB y ` +
                `el máximo es ${MAX_BYTES_COMPROBANTE / 1024} KB.`);
            return;
        }

        const lector = new FileReader();
        lector.onload = () => {
            // readAsDataURL da "data:image/jpeg;base64,XXXX"; el API espera
            // solo la parte de después de la coma.
            const resultado = String(lector.result);
            setComprobante(resultado.slice(resultado.indexOf(",") + 1));
            setError(null);
        };
        lector.readAsDataURL(archivo);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!comprobante) {
            setError("Adjunta la captura de la transferencia.");
            return;
        }
        if (aPagar <= 0) {
            setError("Los descuentos no pueden igualar ni superar el ticket.");
            return;
        }
        mutation.mutate();
    };

    return (
        <ModalShell
            onClose={onClose}
            title={`Pagar a ${ticket.nombreProductora}`}
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-pago-productora"
                        disabled={mutation.isPending}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending
                            ? "Guardando…"
                            : `Pagar $${aPagar.toFixed(2)}`}
                    </button>
                </div>
            }
        >
            <form id="form-pago-productora" onSubmit={handleSubmit}
                className="space-y-4">

                <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm">
                    <p className="font-bold">{ticket.codigoLote}</p>
                    <p className="text-gray-600">
                        {ticket.cuyesEntregados} cuyes · {ticket.centroAcopio}
                    </p>
                    <p className="text-lg font-extrabold text-gray-900 mt-1">
                        Ticket: ${ticket.montoUsd.toFixed(2)}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-bold uppercase tracking-wide
                      text-gray-500 mb-2">
                        Cuyes con novedad del centro de acopio
                    </p>

                    {isLoading && (
                        <p className="text-xs text-gray-400">Cargando…</p>
                    )}

                    {!isLoading && cuyes.length === 0 && (
                        <p className="text-xs text-gray-400">
                            Este lote no trae cuyes con novedad. No hay nada que
                            descontar.
                        </p>
                    )}

                    <div className="space-y-3">
                        {cuyes.map((c) => (
                            <div key={c.novedadId}
                                className="border-2 border-gray-100 rounded-xl p-3
                                    flex items-start gap-3">

                                {c.tieneFoto && (
                                    <EvidenciaNovedad autoCargar
                                        novedadId={c.novedadId} />
                                )}

                                <div className="flex-1 space-y-2">
                                    <p className="text-xs font-bold text-gray-700">
                                        Cuy #{c.numeroEnLote} · {c.tipoNovedad}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {c.descripcion}
                                    </p>

                                    <input
                                        type="text"
                                        placeholder="¿Qué observaste en planta?"
                                        value={descuentos[c.novedadId]?.descripcion ?? ""}
                                        onChange={(e) => setDescuentos({
                                            ...descuentos,
                                            [c.novedadId]: {
                                                descripcion: e.target.value,
                                                montoUsd:
                                                    descuentos[c.novedadId]?.montoUsd ?? 0,
                                            },
                                        })}
                                        className="w-full h-10 px-2 rounded-lg border-2
                                            border-gray-200 text-xs
                                            focus:border-primary-500 focus:outline-none"
                                    />

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                            Descontar $
                                        </span>
                                        <input
                                            type="number" min={0} step={0.01}
                                            inputMode="decimal"
                                            value={descuentos[c.novedadId]?.montoUsd || ""}
                                            onChange={(e) => setDescuentos({
                                                ...descuentos,
                                                [c.novedadId]: {
                                                    descripcion:
                                                        descuentos[c.novedadId]?.descripcion
                                                        ?? "",
                                                    montoUsd: Number(e.target.value),
                                                },
                                            })}
                                            placeholder="0.00"
                                            className="w-24 h-10 px-2 rounded-lg border-2
                                                border-gray-200 text-xs font-bold
                                                focus:border-primary-500
                                                focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {totalDescuento > 0 && (
                    <div className="bg-bayo-50 rounded-xl px-3 py-2 text-sm">
                        <p className="text-bayo-800">
                            Descuentos: −${totalDescuento.toFixed(2)}
                        </p>
                        <p className="font-extrabold text-gray-900">
                            A pagar: ${aPagar.toFixed(2)}
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase
                        tracking-wide text-gray-500 mb-1">
                        Captura de la transferencia
                    </label>
                    <input
                        type="file" accept="image/*" capture="environment"
                        onChange={leerComprobante}
                        className="w-full text-xs file:min-h-[44px] file:px-3
                            file:rounded-xl file:border-2 file:border-primary-200
                            file:bg-primary-50 file:text-primary-800
                            file:font-bold file:text-xs"
                    />
                    {comprobante && (
                        <p className="mt-1 text-xs text-primary-700 font-semibold">
                            ✓ Captura lista para subir
                        </p>
                    )}
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
