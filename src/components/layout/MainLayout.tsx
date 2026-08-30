import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ConectividadContext } from "../../context/ConectividadContextInstance";

// Cada ítem declara qué roles pueden verlo. El admin técnico atiende soporte:
// no aparece en la operación de la cadena. Ocultarlo aquí es cosmética — la
// restricción de verdad vive en los [Authorize] de la API.
const navItems: { to: string; label: string; roles: string[] | null }[] = [
    { to: "/dashboard", label: "Panel", roles: ["AdminCooperativa", "OperadorCAT", "OperadorFaenamiento"] },
    { to: "/productoras", label: "Productoras", roles: ["AdminCooperativa", "OperadorCAT"] },
    { to: "/recepcion", label: "Recepción CAT", roles: ["OperadorCAT", "AdminCooperativa"] },
    { to: "/faenamiento", label: "Faenamiento", roles: ["OperadorFaenamiento", "AdminCooperativa"] },
    { to: "/despacho", label: "Despacho", roles: ["OperadorFaenamiento", "AdminCooperativa"] },
    { to: "/reportes", label: "Reportes", roles: ["AdminCooperativa", "AdminTecnico", "OperadorFaenamiento"] },
    { to: "/vinculaciones", label: "Vinculaciones", roles: ["AdminCooperativa", "AdminTecnico"] },
    { to: "/administracion", label: "Administración", roles: ["AdminCooperativa", "AdminTecnico"] },
    { to: "/sesiones", label: "Sesiones", roles: ["AdminTecnico"] },
];

const NOMBRE_ROL: Record<string, string> = {
    OperadorCAT: "Operador de CAT",
    OperadorFaenamiento: "Operador de faenamiento",
    AdminCooperativa: "Admin. cooperativa",
    AdminTecnico: "Admin. técnico",
};

// Gobiernos locales y academia que respaldan el proyecto. Mismo orden que
// en el login para que la lectura sea la misma en todo el sistema.
const ALIADOS_LOCALES = [
    { src: "/brand/aliados/nabon.png", nombre: "Alcaldía de Nabón", alto: "h-8" },
    { src: "/brand/aliados/santa-isabel.png", nombre: "Alcaldía de Santa Isabel", alto: "h-9" },
    { src: "/brand/aliados/pucara.png", nombre: "Alcaldía de Pucará", alto: "h-9" },
    { src: "/brand/aliados/universidad-catolica.png", nombre: "Universidad Católica de Cuenca", alto: "h-9" },
];

// Niveles 1 y 2 de la jerarquía institucional: el proyecto, y quienes lo
// ejecutan y cofinancian. Mismo orden que en el login y en la página pública.
// Los dos últimos son logotipos muy anchos (3.79:1 y 4.49:1) y a h-7 piden
// unos 256 px: entran recién en lg para no apretar la cabecera en la tablet,
// que es donde se opera en campo.
const ALIADOS_CABECERA = [
    {
        src: "/brand/aliados/familias-campesinas.png",
        nombre: "Familias Campesinas Liderando",
        alto: "h-8 sm:h-9",
        visible: "block",
    },
    {
        src: "/brand/aliados/ayuda-en-accion.png",
        nombre: "Ayuda en Acción",
        alto: "h-7",
        visible: "hidden lg:block",
    },
    {
        src: "/brand/aliados/union-europea.png",
        nombre: "Cofinanciado por la Unión Europea",
        alto: "h-7",
        visible: "hidden lg:block",
    },
];

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
        // El mismo `online` que pinta el indicador de la cabecera baja por
        // contexto a todo lo que se monte dentro de MainLayout (todas las
        // pantallas de la app): así ningún selector ni tabla de
        // Administración necesita su propio listener de online/offline ni
        // leer `navigator.onLine` sin reactividad en el render.
        <ConectividadContext.Provider value={online}>
        <div className="min-h-screen bg-superficie flex flex-col">
            {/* Barra superior: marca + proyecto + estado + salir */}
            <header className="bg-blanco/90 backdrop-blur border-b border-gray-200
                         sticky top-0 z-20">
                <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {/* La marca compacta: cara del cuy sobre azulejo oliva,
                            igual que el ícono de la app. */}
                        <div className="w-9 h-9 bg-oliva-400 rounded-xl flex
                            items-center justify-center shrink-0 overflow-hidden
                            shadow-sm shadow-oliva-600/30">
                            <img src="/brand/cuy-face.png" alt="Cuy Azuayito"
                                className="w-7 h-7 object-contain" />
                        </div>
                        <div className="leading-tight min-w-0">
                            <span className="font-display tracking-tight text-gray-900 block
                               truncate text-[15px]">
                                Cuy Azuayito
                            </span>
                            <span className="hidden sm:block text-[10px] uppercase
                               tracking-widest text-primary-700 font-bold">
                                Coopagcuy · Trazabilidad
                            </span>
                        </div>

                        {/* El filo separa el producto del proyecto que lo
                            respalda: son dos marcas distintas, no una sola. */}
                        <span className="hidden xs:block filo w-1 h-8 rounded-full
                                   ml-1 sm:ml-2" />
                        {/* El hidden xs:flex va aquí y no en cada imagen: si
                            la condición se quedara en el <img>, por debajo de
                            xs este contenedor seguiría existiendo vacío y el
                            gap-2.5 de la fila padre metería 10 px de aire
                            muerto donde hoy no hay nada. */}
                        <div className="hidden xs:flex items-center gap-2.5
                                  lg:gap-3.5">
                            {ALIADOS_CABECERA.map(({ src, nombre, alto, visible }) => (
                                <img key={src} src={src} alt={nombre}
                                    className={`${visible} ${alto} w-auto
                                        object-contain shrink-0`} />
                            ))}
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
                        {/* Estaba en 41×28: por debajo del objetivo táctil y
                            pegado al nombre del usuario. Es la salida de sesión
                            en una tablet compartida, tiene que poder tocarse. */}
                        <button
                            onClick={handleLogout}
                            className="min-h-[44px] min-w-[44px] px-3 shrink-0
                         text-xs font-bold text-teja-500 hover:text-teja-700
                         hover:bg-teja-50 rounded-lg
                         transition-colors duration-150"
                        >
                            Salir
                        </button>
                    </div>
                </div>

                {/* Navegación: fila propia que se desliza en pantallas chicas.
                    El ítem activo lleva el filo oliva. El color y el peso del
                    texto cargan el estado: el filo solo da 1.51:1 contra
                    blanco y no puede ser la única señal. */}
                <nav className="px-2 sm:px-6 border-t border-gray-100">
                    <div className="flex items-center gap-0.5 overflow-x-auto
                          no-scrollbar">
                        {itemsVisibles.map(({ to, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `relative px-3 pt-2.5 pb-2 text-sm whitespace-nowrap
                   rounded-t-lg transition-colors duration-150
                   ${isActive
                                        ? "text-primary-700 font-bold"
                                        : "text-gray-500 font-semibold hover:text-gray-900 hover:bg-gray-50"}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {label}
                                        {isActive && (
                                            <span className="absolute inset-x-2 bottom-0 h-[3px]
                                       bg-oliva-400 rounded-full
                                       animate-filo-ancho origin-left" />
                                        )}
                                    </>
                                )}
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

            {/* Pie: los gobiernos locales y la academia que respaldan el
                proyecto. Un logo institucional no se recolorea ni se pone en
                escala de grises, así que van a color sobre azulejo blanco. */}
            <footer className="bg-blanco border-t border-gray-200 mt-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
                    <div className="flex items-center gap-4 mb-5">
                        <span className="text-[11px] font-semibold uppercase
                               tracking-[0.18em] text-gray-500 whitespace-nowrap">
                            Aliados locales
                        </span>
                        <span className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="flex flex-wrap items-center justify-center
                            sm:justify-start gap-3 sm:gap-4">
                        {ALIADOS_LOCALES.map(({ src, nombre, alto }) => (
                            <div key={src} className="azulejo h-[68px] px-5">
                                <img src={src} alt={nombre} loading="lazy"
                                    className={`${alto} w-auto max-w-full object-contain`} />
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] text-gray-400 mt-6 leading-relaxed
                            text-center sm:text-left">
                        Proyecto Familias Campesinas Liderando · Cofinanciado por la
                        Unión Europea · Ayuda en Acción
                    </p>
                </div>
            </footer>
        </div>
        </ConectividadContext.Provider>
    );
}
