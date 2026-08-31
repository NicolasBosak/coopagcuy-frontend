import { useState } from "react";
import { Segmentado } from "../ui/Segmentado";
import { TablaProvincias } from "./TablaProvincias";
import { TablaCantones } from "./TablaCantones";
import { TablaCentrosAcopio } from "./TablaCentrosAcopio";
import { TablaComunidades } from "./TablaComunidades";

type SubTab = "provincias" | "cantones" | "cat" | "comunidades";

/**
 * Los cuatro catálogos geográficos, en el orden en que se dan de alta.
 *
 * El orden no es alfabético a propósito: es la cadena de dependencias. Para
 * crear una comunidad hace falta un cantón, y para un cantón una provincia.
 * Puestas al revés, el administrador encuentra primero el formulario que
 * todavía no puede llenar.
 */
export function PanelCatalogos() {
    // Arranca en "comunidades" porque es lo que el administrador usa a
    // diario; provincias y cantones se tocan una vez al año.
    const [sub, setSub] = useState<SubTab>("comunidades");

    return (
        <>
            <div className="mb-5">
                <Segmentado
                    activo={sub}
                    onCambio={setSub}
                    opciones={[
                        { id: "provincias", label: "Provincias" },
                        { id: "cantones", label: "Cantones" },
                        { id: "cat", label: "Centros de acopio" },
                        { id: "comunidades", label: "Comunidades" },
                    ]}
                />
            </div>

            {sub === "provincias" && <TablaProvincias />}
            {sub === "cantones" && <TablaCantones />}
            {sub === "cat" && <TablaCentrosAcopio />}
            {sub === "comunidades" && <TablaComunidades />}
        </>
    );
}
