import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { faenamientoApi } from "../../api/faenamiento";
import { reportesApi } from "../../api/reportes";
import { descargarBlob } from "../../utils/download";

interface Props { codigoLote: string; }

export function PanelQR({ codigoLote }: Props) {
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagenUrl, setImagenUrl] = useState<string | null>(null);

    const { data: qr, refetch, isLoading: cargandoQR } = useQuery({
        queryKey: ["qr", codigoLote],
        queryFn: () => faenamientoApi.obtenerQR(codigoLote),
        retry: false,
        throwOnError: false, // el 404 no debe propagarse como excepción
    });

    const { data: inkjet } = useQuery({
        queryKey: ["inkjet", codigoLote],
        queryFn: () => faenamientoApi.obtenerInkJet(codigoLote),
        enabled: !!qr,
        retry: false,
    });

    // La imagen del QR se descarga con el token (un <img src> directo
    // al endpoint no enviaría la autenticación)
    useEffect(() => {
        let url: string | null = null;
        if (qr) {
            faenamientoApi.descargarQRPng(codigoLote)
                .then((blob) => {
                    url = URL.createObjectURL(blob);
                    setImagenUrl(url);
                })
                .catch(() => setImagenUrl(null));
        } else {
            setImagenUrl(null);
        }
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [qr, codigoLote]);

    const handleGenerar = async () => {
        setGenerando(true);
        setError(null);
        try {
            await faenamientoApi.generarQR(codigoLote);
            await refetch();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje ?? "No se pudo generar el QR.");
        } finally {
            setGenerando(false);
        }
    };

    const handleDescargar = async () => {
        try {
            const blob = await faenamientoApi.descargarQRPng(codigoLote);
            descargarBlob(blob, `QR-${codigoLote}.png`);
        } catch {
            setError("No se pudo descargar el QR.");
        }
    };

    const handleDescargarPDF = async () => {
        try {
            const blob = await reportesApi.exportarPDFLote(codigoLote);
            descargarBlob(blob, `Ficha-${codigoLote}.pdf`);
        } catch {
            setError("No se pudo descargar la ficha PDF.");
        }
    };

    if (cargandoQR) {
        return (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-400">Verificando QR existente...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Código QR
            </p>

            {!qr ? (
                <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                        Aún no se ha generado el QR para este lote.
                    </p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg
                            px-3 py-2 text-xs text-red-700">
                            {error}
                        </div>
                    )}
                    <button
                        onClick={handleGenerar}
                        disabled={generando}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white text-sm
                       font-medium rounded-lg transition"
                    >
                        {generando ? "Generando..." : "Generar QR"}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">

                    {/* Imagen del QR generado */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4
                          flex items-center justify-center">
                        {imagenUrl ? (
                            <img
                                src={imagenUrl}
                                alt={`Código QR del lote ${codigoLote}`}
                                className="w-40 h-40"
                            />
                        ) : (
                            <div className="w-40 h-40 flex items-center justify-center
                              text-xs text-gray-400">
                                Cargando QR…
                            </div>
                        )}
                    </div>

                    {/* Datos para el codificador Ink Jet */}
                    {inkjet && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">
                                Datos codificador Ink Jet
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {(
                                    [
                                        ["Lote", inkjet.codigoLote],
                                        ["Faenado", inkjet.fechaFaenamiento],
                                        ["Vence", inkjet.fechaVencimiento],
                                        ["Comunidad", inkjet.comunidadOrigen],
                                        ["Unidades", String(inkjet.unidadesFaenadas)],
                                        ["Peso prom.", `${inkjet.pesoPromedioCanalGramos}g`],
                                    ] as [string, string][]
                                ).map(([k, v]) => (
                                    <div key={k} className="flex gap-1">
                                        <span className="text-gray-400">{k}:</span>
                                        <span className="text-gray-700 font-medium">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleDescargar}
                            className="flex-1 py-2 border border-primary-300
                         text-primary-700 hover:bg-primary-50
                         rounded-lg text-xs font-medium transition"
                        >
                            Descargar PNG
                        </button>
                        <button
                            onClick={handleDescargarPDF}
                            className="flex-1 py-2 border border-gray-300 text-gray-600
                         hover:bg-gray-50 rounded-lg text-xs font-medium
                         transition"
                        >
                            Ficha PDF
                        </button>
                    </div>

                    <a
                        href={`/qr/${codigoLote}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block py-2 border border-gray-300 text-gray-600
                       hover:bg-gray-50 rounded-lg text-xs font-medium
                       text-center transition"
                    >
                        Ver página pública
                    </a>

                    {error && (
                        <p className="text-xs text-red-600">{error}</p>
                    )}
                </div>
            )}
        </div>
    );
}
