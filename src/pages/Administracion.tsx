import { useState } from "react";
import { MainLayout } from "../components/layout/MainLayout";
import { Segmentado } from "../components/ui/Segmentado";
import { TablaUsuarios } from "../components/admin/TablaUsuarios";
import { TablaComunidades } from "../components/admin/TablaComunidades";
import { SolicitudesPassword } from "../components/admin/SolicitudesPassword";

type Tab = "usuarios" | "comunidades" | "contrasenas";

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
                    Usuarios, catálogo de comunidades y solicitudes de contraseña
                </p>
            </div>

            <Segmentado
                activo={tab}
                onCambio={setTab}
                opciones={[
                    { id: "usuarios", label: "Usuarios" },
                    { id: "comunidades", label: "Comunidades" },
                    { id: "contrasenas", label: "Contraseñas" },
                ]}
            />

            {tab === "usuarios" && <TablaUsuarios />}
            {tab === "comunidades" && <TablaComunidades />}
            {tab === "contrasenas" && <SolicitudesPassword />}
        </MainLayout>
    );
}
