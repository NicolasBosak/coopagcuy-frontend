/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            screens: {
                // Punto de quiebre extra pequeño para teléfonos
                xs: "420px",
            },
            colors: {
                primary: {
                    50: "#f0f7f1",
                    100: "#dcebde",
                    300: "#8fc49a",
                    500: "#3d8a4c",
                    600: "#2f6b3a",
                    700: "#27582f",
                    800: "#1f4626",
                    900: "#17351d",
                },
                brand: "#2F6B3A",
                // Bayo: color de pelaje aceptado del cuy — acento cálido de marca
                bayo: {
                    50: "#fdf6ea",
                    100: "#f9e8c8",
                    400: "#eeb257",
                    500: "#e8a13d",
                    600: "#c9832a",
                    700: "#a5671f",
                },
                // Crema del páramo: fondo cálido de la aplicación
                crema: "#faf7f0",
                // Rojo teja: rechazos y errores
                teja: {
                    50: "#fbeeec",
                    100: "#f5d5d0",
                    500: "#c0392b",
                    600: "#a93226",
                    700: "#8e2a20",
                },
                tierra: "#7a5230",
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
