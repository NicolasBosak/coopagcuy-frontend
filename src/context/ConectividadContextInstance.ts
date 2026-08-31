import { createContext } from "react";

// El objeto de contexto vive en su propio archivo (sin componentes), igual
// que AuthContextInstance.ts: si MainLayout.tsx o useIsOnline.ts exportaran
// también este `createContext`, Fast Refresh dejaría de tratarlos como
// módulos de componente/hook puro (react-refresh/only-export-components).
//
// El valor por defecto (`true`) solo se usaría si algún consumidor se
// montara fuera de MainLayout, que es quien de verdad provee el valor
// reactivo — no debería ocurrir, pero "en línea" es una suposición más
// segura que "sin conexión" para ese caso hipotético.
export const ConectividadContext = createContext<boolean>(true);
