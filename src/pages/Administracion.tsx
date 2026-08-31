import { useState } from "react";
import { MainLayout } from "../components/layout/MainLayout";
import { Segmentado } from "../components/ui/Segmentado";
import { TablaUsuarios } from "../components/admin/TablaUsuarios";
import { PanelCatalogos } from "../components/admin/PanelCatalogos";
import { SolicitudesPassword } from "../components/admin/SolicitudesPassword";

type Tab = "usuarios" | "catalogos" | "contrasenas";

// Esta pantalla solo elige pestaña. Cada una gestiona sus propios datos,
// su formulario y sus errores: antes vivían las tres cosas aquí y el
// archivo mezclaba responsabilidades que no se tocan entre sí.
export default function Administracion() {
    const [tab, setTab] = useState<Tab>("usuarios");

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                    Administración
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Usuarios, catálogos geográficos y solicitudes de contraseña
                </p>
            </div>

            <div className="mb-5">
                <Segmentado
                    activo={tab}
                    onCambio={setTab}
                    opciones={[
                        { id: "usuarios", label: "Usuarios" },
                        { id: "catalogos", label: "Catálogos" },
                        { id: "contrasenas", label: "Contraseñas" },
                    ]}
                />
            </div>

            {tab === "usuarios" && <TablaUsuarios />}
            {tab === "catalogos" && <PanelCatalogos />}
            {tab === "contrasenas" && <SolicitudesPassword />}
        </MainLayout>
    );
}
