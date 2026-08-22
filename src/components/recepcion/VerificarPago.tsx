import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pagosApi } from "../../api/pagos";
import { useAuth } from "../../context/useAuth";
import { ImagenProtegida } from "../ui/ImagenProtegida";
import type { Pago } from "../../types/productora";

interface Props {
    pago: Pago;
}

/**
 * Cierre del ciclo para la operadora del CAT: mira la captura que subió la
 * planta y confirma que el dinero llegó.
 *
 * La captura se carga sola (`autoCargar`): la operadora abre esta fila
 * precisamente para verla, y la lista de pagos por verificar es corta —a
 * diferencia del historial completo, donde descargar todo sería un derroche.
 */
export function VerificarPago({ pago }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: () => pagosApi.verificar(pago.id, auth.nombreCompleto ?? ""),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pagos"] });
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo marcar el pago como recibido.");
        },
    });

    return (
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl
            px-3 py-2 flex items-start gap-3">

            {pago.tieneComprobante && (
                <ImagenProtegida
                    autoCargar
                    claveCache={["comprobante-pago", pago.id]}
                    descargar={() => pagosApi.comprobante(pago.id)}
                    textoBoton="Ver comprobante"
                    textoCaducada="El comprobante ya no está disponible (se borra a los 5 días de verificarlo)."
                    textoAlternativo="Captura de la transferencia"
                />
            )}

            <div className="flex-1">
                <p className="text-xs font-bold text-primary-800">
                    💸 La planta transfirió ${(pago.montoPagadoUsd ?? 0).toFixed(2)}
                </p>
                {pago.montoPagadoUsd !== null
                    && pago.montoPagadoUsd < pago.montoUsd && (
                        <p className="text-xs text-bayo-700">
                            Con descuento: el ticket era de
                            {" "}${pago.montoUsd.toFixed(2)}
                        </p>
                    )}
                <p className="text-xs text-gray-500">
                    Registrado por {pago.pagadoPor}
                </p>

                <button
                    type="button"
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                    className="mt-2 min-h-[44px] px-4 rounded-xl bg-primary-600
                        hover:bg-primary-700 disabled:bg-primary-300 text-white
                        text-xs font-bold transition active:scale-95"
                >
                    {mutation.isPending ? "Guardando…" : "✓ Recibí el pago"}
                </button>

                {error && (
                    <p className="mt-1 text-xs text-teja-700">{error}</p>
                )}
            </div>
        </div>
    );
}
