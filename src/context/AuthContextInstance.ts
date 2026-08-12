import { createContext } from "react";
import type { AuthContextType } from "./AuthContext";

// El objeto de contexto vive en su propio archivo (sin componentes) para
// que ni AuthContext.tsx ni useAuth.ts mezclen un export de componente con
// uno que no lo es: eso es lo que rompe el Fast Refresh
// (react-refresh/only-export-components).
export const AuthContext = createContext<AuthContextType | null>(null);
