/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            screens: {
                // Punto de quiebre extra pequeño para teléfonos
                xs: "420px",
            },
            // ── Paleta institucional del proyecto ─────────────────────────
            // La paleta ES el consorcio: cada color pertenece a una de las
            // instituciones que sostienen el proyecto. No es una elección
            // estética suelta, es la identidad de quienes financian, ejecutan
            // y respaldan la cadena.
            //
            //   cyan    #006C79 → Familias Campesinas Liderando
            //   oliva   #cddd00 → Cuy Azuayito (el producto)
            //   naranja #F87C56 → Ayuda en Acción
            //   azul    #304f9e → Unión Europea
            //   gris    #ebebea → el suelo donde todo se apoya
            //   blanco  #FFFFFF → la superficie de contenido
            //
            // Los nombres de token se conservan para no romper los ~400 usos
            // existentes; solo cambia el valor. Cada escala se derivó de su
            // semilla y se verificó contra WCAG AA en los pares críticos.
            colors: {
                // Cyan de Familias Campesinas. El caballo de batalla del
                // sistema: acciones, navegación, enlaces, estructura y el
                // estado "aceptado" del cuy.
                primary: {
                    50: "#e6f2f3",
                    100: "#c2e0e3",
                    200: "#8ec6cc",
                    300: "#4da5af",
                    400: "#1b8894",
                    500: "#006c79", // semilla · texto sobre blanco 6.14:1 AA
                    600: "#005a66", // acción principal · blanco 7.92:1 AA
                    700: "#004954", // texto sobre claro · 10.1:1 AAA
                    800: "#003a43",
                    900: "#002b32",
                },
                brand: "#006c79",

                // Verde oliva — el verde del logo Cuy. Es la FIRMA del
                // sistema: el filo que marca "aquí es donde estás". Solo
                // filos, foco y realce activo.
                //
                // REGLA DURA: sobre blanco da 1.51:1. Nunca es texto, nunca
                // lleva texto blanco encima y nunca es relleno grande sobre
                // claro. Cuando se usa como fondo, el texto va casi negro.
                oliva: {
                    50: "#fbfde8",
                    100: "#f6fbc2",
                    200: "#edf78c",
                    300: "#dfef46",
                    400: "#cddd00", // semilla de marca
                    500: "#b4c200",
                    600: "#8d9900",
                    700: "#6a7200", // único tono legible como texto · 5.22:1 AA
                    800: "#4e5400",
                },

                // Naranja de Ayuda en Acción. Estado "con novedad" y acentos
                // cálidos. Como relleno lleva texto oscuro (2.62:1 con
                // blanco); para texto sobre claro se usa bayo-700.
                bayo: {
                    50: "#fef2ee",
                    100: "#fddfd5",
                    200: "#fbc0ac",
                    300: "#fa9e81",
                    400: "#f87c56", // semilla de marca · fondo de insignia
                    500: "#f05f33",
                    600: "#d64a20",
                    700: "#a83914", // texto sobre claro · 6.44:1 AA
                    800: "#832d10",
                },

                // Rojo de apoyo — el rojo del logo Cuy (#F0303C) oscurecido
                // y enfriado. NO está en la paleta de cinco: se añadió porque
                // el sistema tiene que distinguir "tiene una observación"
                // (naranja) de "no pasó el control" (rojo), y en trazabilidad
                // alimentaria esa diferencia decide si un lote sale o no.
                // Separado en tono del naranja a propósito.
                // Uso exclusivo: rechazo, error y acción destructiva.
                teja: {
                    50: "#fcecee",
                    100: "#f7ccd0",
                    200: "#ee9aa1",
                    300: "#e26670",
                    400: "#cd3f4a",
                    500: "#b02a32", // semilla · texto sobre blanco 6.51:1 AA
                    600: "#96222a",
                    700: "#771a21",
                    800: "#5d141a",
                },

                // Azul de la Unión Europea. Avisos informativos que NO
                // rechazan al animal (como el sobrepeso >1300 g) y segunda
                // serie en los gráficos.
                info: {
                    50: "#eef1f9",
                    100: "#d2daee",
                    200: "#a8b8dd",
                    300: "#7b91c8",
                    400: "#5470b4",
                    500: "#304f9e", // semilla · texto sobre blanco 7.68:1 AA
                    600: "#27407f",
                    700: "#1d3062",
                    800: "#16244a",
                },

                // ── Las dos superficies del sistema ───────────────────────
                // Blanco es el contenido, gris es el suelo. Sin excepciones:
                // formularios, tarjetas, cabecera, pie y azulejos de logo van
                // en blanco; el fondo de la aplicación va en gris.
                blanco: "#ffffff",
                superficie: "#ebebea",
            },
            fontFamily: {
                // Nexa Bold: fuente de marca provista por la cooperativa.
                // Solo display — títulos, la palabra "Cuy Azuayito" y
                // números grandes.
                display: ['"Nexa Bold"', "system-ui", "sans-serif"],
                // IBM Plex Sans: cuerpo. Auto-alojada y variable (un archivo
                // cubre todos los pesos). Trae cifras tabulares, que importan
                // en un sistema lleno de pesos en gramos y conteos.
                sans: [
                    '"IBM Plex Sans"', "system-ui", "-apple-system",
                    '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif",
                ],
            },
            // ── Curvas de movimiento ──────────────────────────────────────
            // Las curvas nativas de CSS son demasiado flojas: les falta el
            // acento que hace que una animación se sienta intencionada.
            transitionTimingFunction: {
                // Entradas y salidas: arranca rápido, se siente reactivo.
                salida: "cubic-bezier(0.23, 1, 0.32, 1)",
                // Movimiento en pantalla: acelera y frena natural.
                suave: "cubic-bezier(0.77, 0, 0.175, 1)",
                // Hojas y cajones, curva tipo iOS.
                hoja: "cubic-bezier(0.32, 0.72, 0, 1)",
            },
            animation: {
                // Todo por debajo de 300 ms salvo la entrada escalonada:
                // es una herramienta de trabajo, no una landing.
                "fade-in": "fadeIn 220ms cubic-bezier(0.23, 1, 0.32, 1) both",
                "fade-in-up": "fadeInUp 300ms cubic-bezier(0.23, 1, 0.32, 1) both",
                "slide-in": "slideIn 280ms cubic-bezier(0.23, 1, 0.32, 1) both",
                "sheet-up": "sheetUp 300ms cubic-bezier(0.32, 0.72, 0, 1) both",
                // El filo oliva creciendo desde arriba: la firma entrando.
                "filo-crecer": "filoCrecer 420ms cubic-bezier(0.77, 0, 0.175, 1) both",
                "filo-ancho": "filoAncho 380ms cubic-bezier(0.77, 0, 0.175, 1) both",
            },
            keyframes: {
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideIn: {
                    "0%": { opacity: "0", transform: "translateX(20px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                // Entrada tipo hoja inferior en móvil
                sheetUp: {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "translateY(0)" },
                },
                // El filo vertical del login se dibuja de arriba a abajo
                filoCrecer: {
                    "0%": { transform: "scaleY(0)" },
                    "100%": { transform: "scaleY(1)" },
                },
                // El filo corto sobre un encabezado se dibuja hacia la derecha
                filoAncho: {
                    "0%": { transform: "scaleX(0)" },
                    "100%": { transform: "scaleX(1)" },
                },
            },
        },
    },
    plugins: [],
};
