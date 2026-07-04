import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Cada ítem declara qué roles pueden verlo; null = todos
const navItems: { to: string; label: string; roles: string[] | null }[] = [
    { to: "/dashboard", label: "Panel", roles: null },
    { to: "/productoras", label: "Productoras", roles: ["AdminCooperativa", "AdminTecnico", "OperadorCAT"] },
    { to: "/recepcion", label: "Recepción CAT", roles: ["OperadorCAT", "AdminCooperativa", "AdminTecnico"] },
    { to: "/faenamiento", label: "Faenamiento", roles: ["OperadorFaenamiento", "AdminCooperativa", "AdminTecnico"] },
    { to: "/reportes", label: "Reportes", roles: ["AdminCooperativa", "AdminTecnico"] },
    { to: "/administracion", label: "Administración", roles: ["AdminCooperativa", "AdminTecnico"] },
];

const NOMBRE_ROL: Record<string, string> = {
    OperadorCAT: "Operador de CAT",
    OperadorFaenamiento: "Operador de faenamiento",
    AdminCooperativa: "Admin. cooperativa",
    AdminTecnico: "Admin. técnico",
};

export function MainLayout({ children }: { children: ReactNode }) {
    const { auth, logout } = useAuth();
    const navigate = useNavigate();
    const [online, setOnline] = useState(navigator.onLine);

    // Indicador global de conexión: visible en toda la aplicación
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);

    const handleLogout = () => { logout(); navigate("/login"); };

    const itemsVisibles = navItems.filter(
        (i) => i.roles === null || (auth.rol && i.roles.includes(auth.rol)));

    return (
        <div className="min-h-screen bg-crema flex flex-col">
            {/* Barra superior: marca + estado + salir */}
            <header className="bg-white/90 backdrop-blur border-b border-gray-200
                         sticky top-0 z-20">
                <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 bg-primary-600 rounded-xl flex
                            items-center justify-center shrink-0
                            shadow-sm shadow-primary-600/30">
                            <span className="text-white text-base font-extrabold">C</span>
                        </div>
                        <div className="leading-tight min-w-0">
                            <span className="font-extrabold tracking-tight text-gray-900 block
                               truncate">
                                Cuy Azuayito
                            </span>
                            <span className="hidden sm:block text-[10px] uppercase
                               tracking-widest text-primary-700 font-bold">
                                Coopagcuy · Trazabilidad
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span
                            title={online ? "Con conexión a internet" : "Sin conexión — modo local"}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold
                          rounded-full px-2.5 py-1
                          ${online
                                    ? "bg-primary-50 text-primary-700"
                                    : "bg-bayo-50 text-bayo-700"}`}
                        >
                            <span className={`w-2 h-2 rounded-full
                            ${online ? "bg-primary-500" : "bg-bayo-500 animate-pulse"}`} />
                            <span className="hidden xs:inline">
                                {online ? "En línea" : "Sin señal"}
                            </span>
                        </span>

                        <div className="hidden md:block text-right leading-tight">
                            <span className="text-xs font-semibold text-gray-700 block">
                                {auth.nombreCompleto}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {auth.rol ? NOMBRE_ROL[auth.rol] ?? auth.rol : ""}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-teja-500 hover:text-teja-700 font-bold
                         px-2 py-1.5"
                        >
                            Salir
                        </button>
                    </div>
                </div>

                {/* Navegación: fila propia que se desliza en pantallas chicas */}
                <nav className="px-2 sm:px-6 border-t border-gray-100">
                    <div className="flex items-center gap-0.5 overflow-x-auto
                          no-scrollbar py-1.5">
                        {itemsVisibles.map(({ to, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap
                   transition-colors
                   ${isActive
                                        ? "bg-primary-600 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </header>

            {/* Contenido */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8
                       animate-fade-in">
                {children}
            </main>

            <footer className="text-center text-[11px] text-gray-400 pb-4">
                Proyecto Familias Campesinas Liderando · Comisión Europea · Ayuda en Acción
            </footer>
        </div>
    );
}
