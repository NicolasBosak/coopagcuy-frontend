import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faenamientoApi } from "../../api/faenamiento";
import { useAuth } from "../../context/AuthContext";
import { ModalShell } from "../ui/ModalShell";

interface Props {
    onClose: () => void;
}

// Registro de despacho comercial con detalle por animal: se elige el lote
// faenado (FAE-…) y los cuyes específicos que van al cliente. El saldo
// del lote baja con cada despacho y, al agotarse, el lote deja de
// aparecer en el selector.
// datetime-local trabaja en hora local, pero toISOString() devuelve UTC: sin
// descontar el offset la operadora vería las 15:00 cuando en Ecuador son las
// 10:00, y con el mínimo puesto en "ahora" no podría agendar nada.
const aInputLocal = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16);

export function FormDespacho({ onClose }: Props) {
    const qc = useQueryClient();
    const { auth } = useAuth();
    const ahora = aInputLocal(new Date());

    const [loteFaenadoId, setLoteFaenadoId] = useState(0);
    const [seleccionados, setSeleccionados] = useState<number[]>([]);
    const [clienteDestino, setClienteDestino] = useState("");
    const [fechaDespacho, setFechaDespacho] = useState(ahora);
    const [responsable, setResponsable] = useState(auth.nombreCompleto ?? "");
    const [chofer, setChofer] = useState("");
    const [ruta, setRuta] = useState("");
    const [tipoMercado, setTipoMercado] = useState("Local");
    const [ciudad, setCiudad] = useState("");
    const [pais, setPais] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [error, setError] = useState<string | null>(null);

    const { data: despachables = [], isLoading } = useQuery({
        queryKey: ["despachos-disponibles"],
        queryFn: () => faenamientoApi.listarDespachables(),
    });

    const loteElegido = despachables.find(
        (l) => l.loteFaenadoId === loteFaenadoId);

    const toggleCuy = (id: number) =>
        setSeleccionados((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]);

    const mutation = useMutation({
        mutationFn: () => faenamientoApi.registrarDespacho({
            loteFaenadoId,
            cuyFaenamientoIds: seleccionados,
            clienteDestino,
            // El input da hora local; el API espera ISO-8601 UTC
            fechaDespacho: new Date(fechaDespacho).toISOString(),
            responsable,
            chofer: chofer || undefined,
            ruta: ruta || undefined,
            tipoMercado,
            ciudad: ciudad || undefined,
            pais: pais || undefined,
            observaciones: observaciones || undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["despachos"] });
            qc.invalidateQueries({ queryKey: ["despachos-disponibles"] });
            onClose();
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { mensaje?: string } } };
            setError(err.response?.data?.mensaje
                ?? "No se pudo registrar el despacho.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!loteElegido) {
            setError("Selecciona el lote faenado que se despacha.");
            return;
        }
        if (seleccionados.length === 0) {
            setError("Selecciona al menos un animal para despachar.");
            return;
        }
        mutation.mutate();
    };

    return (
        <ModalShell
            onClose={onClose}
            title="Registrar despacho"
            maxWidth="max-w-2xl"
            footer={
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-12 border-2 border-gray-200 rounded-2xl
                       text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button type="submit" form="form-despacho"
                        disabled={mutation.isPending || seleccionados.length === 0}
                        className="flex-1 h-12 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white rounded-2xl
                       text-sm font-bold transition">
                        {mutation.isPending
                            ? "Guardando…"
                            : seleccionados.length === 0
                                ? "Registrar despacho"
                                : `Despachar ${seleccionados.length} ` +
                                  (seleccionados.length === 1 ? "cuy" : "cuyes")}
                    </button>
                </div>
            }
        >
            <form id="form-despacho" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Lote faenado que se despacha
                    </label>
                    <select
                        required
                        value={loteFaenadoId}
                        onChange={(e) => {
                            setLoteFaenadoId(Number(e.target.value));
                            setSeleccionados([]);
                        }}
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                    >
                        <option value={0}>
                            {isLoading
                                ? "Cargando lotes…"
                                : despachables.length === 0
                                    ? "No hay lotes con saldo por despachar"
                                    : "Seleccionar lote faenado…"}
                        </option>
                        {despachables.map((l) => (
                            <option key={l.loteFaenadoId} value={l.loteFaenadoId}>
                                {l.codigo} · {new Date(l.fechaFaenamiento)
                                    .toLocaleDateString("es-EC")}
                                {" · "}{l.disponibles} de {l.totalFaenadas} disponibles
                            </option>
                        ))}
                    </select>
                </div>

                {/* Animales disponibles del lote elegido: tarjetas táctiles */}
                {loteElegido && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                            ¿Qué animales van al cliente?
                            <span className="ml-2 text-primary-700 normal-case">
                                {seleccionados.length} de {loteElegido.disponibles}
                                {" "}seleccionados
                            </span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2
                            max-h-56 overflow-y-auto pr-1">
                            {loteElegido.cuyes.map((c) => {
                                const activo = seleccionados
                                    .includes(c.cuyFaenamientoId);
                                return (
                                    <button
                                        key={c.cuyFaenamientoId}
                                        type="button"
                                        onClick={() => toggleCuy(c.cuyFaenamientoId)}
                                        className={`min-h-[44px] px-3 py-2 rounded-xl border-2
                                text-left transition active:scale-[0.98]
                                ${activo
                                                ? "border-primary-600 bg-primary-50"
                                                : "border-gray-200 bg-white hover:border-gray-300"}`}
                                    >
                                        <span className="block font-mono text-[11px]
                                        text-gray-500">
                                            {c.codigoJaula}
                                        </span>
                                        <span className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-gray-800">
                                                Cuy #{c.numeroEnLote}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {c.pesoCanalGramos != null
                                                    ? `${Math.round(c.pesoCanalGramos)}g`
                                                    : "—"}
                                            </span>
                                        </span>
                                        {c.estado === "ConNovedad" && (
                                            <span className="text-[10px] font-bold text-bayo-700">
                                                ⚠ Con novedad
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                            text-gray-500 mb-1">
                        Cliente destino
                    </label>
                    <input
                        type="text" required
                        value={clienteDestino}
                        onChange={(e) => setClienteDestino(e.target.value)}
                        placeholder="Nombre del restaurante, feria o comprador"
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                         text-sm focus:border-primary-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                          text-gray-500 mb-1">
                        Fecha
                    </label>
                    {/* El despacho se puede agendar hacia adelante, nunca hacia
                        atrás: min corta las fechas pasadas en el propio picker */}
                    <input
                        type="datetime-local" required
                        min={ahora}
                        value={fechaDespacho}
                        onChange={(e) => setFechaDespacho(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                       text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Puedes agendar una entrega futura.
                    </p>
                </div>

                {/* Transporte de salida: aparece en el reporte de Salida */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Chofer
                            <span className="text-gray-300 normal-case"> (opcional)</span>
                        </label>
                        <input
                            type="text"
                            value={chofer}
                            onChange={(e) => setChofer(e.target.value)}
                            placeholder="Nombre del chofer"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide
                              text-gray-500 mb-1">
                            Ruta
                            <span className="text-gray-300 normal-case"> (opcional)</span>
                        </label>
                        <input
                            type="text"
                            value={ruta}
                            onChange={(e) => setRuta(e.target.value)}
                            placeholder="Ej: Santa Isabel → Cuenca"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Mercado de destino: alimenta la trazabilidad hacia adelante */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wide
                          text-gray-500 mb-1">
                        Mercado de destino
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {["Local", "Nacional", "Internacional"].map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setTipoMercado(m)}
                                className={`h-11 rounded-xl border-2 text-sm font-semibold
                              transition active:scale-[0.97]
                              ${tipoMercado === m
                                        ? "border-primary-600 bg-primary-50 text-primary-800"
                                        : "border-gray-200 bg-white text-gray-600"}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <input
                            type="text"
                            value={ciudad}
                            onChange={(e) => setCiudad(e.target.value)}
                            placeholder="Ciudad (ej. Cuenca)"
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                        />
                        <input
                            type="text"
                            value={pais}
                            onChange={(e) => setPais(e.target.value)}
                            placeholder={tipoMercado === "Internacional"
                                ? "País (ej. Perú)" : "País (opcional)"}
                            className="w-full h-11 px-3 rounded-xl border-2 border-gray-200
                           text-sm focus:border-primary-500 focus:outline-none"
                        />
                    </div>
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
                        placeholder="Notas del despacho"
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
