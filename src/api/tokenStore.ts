// Access token JWT en MEMORIA, nunca en localStorage. Así, aunque un ataque
// XSS lograra ejecutar código, no encuentra el token guardado en disco: solo
// vive mientras la pestaña está abierta. La sesión de 7 días la sostiene la
// cookie httpOnly del refresh token, invisible a JavaScript.
//
// La identidad NO secreta (nombre, rol, CAT) sí se persiste en localStorage
// para poder "entrar directo" sin conexión; ver AuthContext.

let accessToken: string | null = null;

export const tokenStore = {
    get: () => accessToken,
    set: (t: string | null) => { accessToken = t; },
    clear: () => { accessToken = null; },
};
