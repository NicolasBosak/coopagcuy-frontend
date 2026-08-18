/**
 * Primera pantalla de cada rol.
 *
 * El admin técnico atiende soporte y ya no puede abrir el panel, así que
 * mandarlo a /dashboard tras iniciar sesión lo dejaría mirando un rechazo.
 * Se usa en dos sitios —el login y el rechazo por rol de PrivateRoute— y por
 * eso vive aquí y no duplicado en cada uno.
 *
 * Acepta `string` y no `RolUsuario` a propósito: la respuesta del login trae
 * el rol como texto suelto del servidor. Estrechar el tipo aquí obligaría a
 * un aserto en el sitio donde menos garantías hay de que el valor sea válido.
 */
export function rutaInicial(rol: string | null): string {
    return rol === "AdminTecnico" ? "/reportes" : "/dashboard";
}
