// Copia un objeto sin las claves indicadas. Alternativa a la desestructuración
// con resto (`const { a, ...resto } = obj`) cuando el valor extraído no se
// usa: esa forma haría que ESLint marque `a` como variable sin usar. A
// diferencia de reconstruir el objeto campo por campo, sigue automáticamente
// cualquier campo nuevo que se añada al tipo de origen.
export function omitir<T extends object, K extends keyof T>(
    obj: T, claves: readonly K[]
): Omit<T, K> {
    const copia = { ...obj };
    for (const clave of claves) delete copia[clave];
    return copia;
}
