/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            screens: {
                // Punto de quiebre extra pequeño para teléfonos
                xs: "420px",
            },
            // ── Paleta de marca Cuy Azuayito ──────────────────────────────
            // Todos los tonos se muestrearon de los píxeles del logo oficial
            // (logo-Cuy-1-(2).png). Los nombres de token se conservan para no
            // romper las clases existentes; solo cambia el valor al color real
            // de la marca. La escala de cada color se derivó del tono semilla
            // y se verificó contra WCAG AA en los pares texto/fondo críticos.
            colors: {
                // Verde de monte — el chartreuse de marca llevado a un verde
                // usable y legible ("pasto de altura"). Acciones, navegación,
                // enlaces y el estado "aceptado" del cuy.
                primary: {
                    50: "#f5f8ea",
                    100: "#e7f0c6",
                    200: "#d3e59a",
                    300: "#b6d15f",
                    400: "#8fae2e",
                    500: "#6f8c16",
                    600: "#5a7a0a", // acción principal · blanco 4.97:1 AA
                    700: "#47610a", // texto sobre claro · 7.04:1 AA
                    800: "#384e0a",
                    900: "#2b3a0b",
                },
                brand: "#5a7a0a",
                // Lima — el chartreuse #CCD800 tal cual del logo. Es la FIRMA:
                // solo fondos de marca (hero del login, contenedor del cuy,
                // acentos). Nunca texto ni etiqueta de botón: como texto da
                // 1.57:1, ilegible. Sobre lima, el texto va SIEMPRE oscuro.
                lima: {
                    50: "#fbfde6",
                    100: "#f5fabf",
                    200: "#eaf58a",
                    300: "#dcec4f",
                    400: "#ccd800", // semilla de marca
                    500: "#b3bd00",
                    600: "#8f9600",
                    700: "#6b7000",
                },
                // Bayo — el naranja de marca #FC9C18 (mejillas del cuy y
                // "Sabor de altura"). Estado "con novedad" y acentos cálidos.
                bayo: {
                    50: "#fff6e6",
                    100: "#ffe8bf",
                    400: "#ffb84d",
                    500: "#fc9c18", // semilla de marca · fondo de insignia
                    600: "#e07f00",
                    700: "#a85c00", // texto sobre claro · 4.99:1 AA
                    800: "#844500",
                },
                // Crema del páramo: fondo cálido de la aplicación
                crema: "#faf7f0",
                // Rojo teja — el rojo de marca #F0303C. Rechazos y errores.
                teja: {
                    50: "#fdecec",
                    100: "#fbd0d2",
                    500: "#f0303c", // semilla de marca
                    600: "#cf1f2b", // texto · 5.41:1 AA
                    700: "#a81822",
                },
                // Tierra — el marrón de marca #90540C (orejas y hocico).
                tierra: "#90540c",
                // Azul cielo/mar — los azules de marca (#60C0E4 cielo y
                // #2478D8 mar). Avisos informativos que NO rechazan al animal,
                // como el sobrepeso (>1300 g).
                info: {
                    50: "#eaf4fc",
                    100: "#cbe4f8",
                    400: "#6cc0f0", // cielo del logo
                    500: "#2478d8", // mar del logo
                    600: "#1b62b8", // texto · 6.02:1 AA
                    700: "#164e92",
                },
            },
            fontFamily: {
                // Nexa Bold: fuente de marca provista. Solo display —
                // títulos, la palabra "Cuy Azuayito" y números grandes.
                display: ['"Nexa Bold"', "system-ui", "sans-serif"],
                // Cuerpo: sans neutro y legible, sin descarga adicional
                // (importa en tablets rurales offline).
                sans: [
                    "system-ui", "-apple-system", '"Segoe UI"',
                    "Roboto", "Helvetica", "Arial", "sans-serif",
                ],
            },
            animation: {
                "fade-in-up": "fadeInUp 0.35s ease-out both",
                "fade-in": "fadeIn 0.25s ease-out both",
                "slide-in": "slideIn 0.3s ease-out both",
                "sheet-up": "sheetUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
            },
            keyframes: {
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideIn: {
                    "0%": { opacity: "0", transform: "translateX(24px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                // Entrada tipo hoja inferior en móvil
                sheetUp: {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};
