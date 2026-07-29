// Validación de la cédula de identidad ecuatoriana. Es el MISMO algoritmo
// que aplica el backend (Common/Auth/ValidadorCedula.cs); se replica aquí
// para que, sin conexión, el operador reciba el rechazo de inmediato en vez
// de descubrir el error recién al sincronizar días después.
//   · 10 dígitos numéricos
//   · código de provincia entre 01 y 24
//   · tercer dígito menor a 6 (6 y 9 son RUC, no cédulas)
//   · dígito verificador por módulo 10 (coeficientes 2,1,2,1,2,1,2,1,2;
//     a los productos mayores a 9 se les resta 9)
export function esCedulaValida(cedula: string | null | undefined): boolean {
    if (!cedula) return false;

    const c = cedula.trim();
    if (c.length !== 10 || !/^\d{10}$/.test(c)) return false;

    const provincia = parseInt(c.slice(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;

    if (Number(c[2]) > 5) return false;

    let suma = 0;
    for (let i = 0; i < 9; i++) {
        const producto = Number(c[i]) * (i % 2 === 0 ? 2 : 1);
        suma += producto > 9 ? producto - 9 : producto;
    }

    const verificador = (10 - (suma % 10)) % 10;
    return verificador === Number(c[9]);
}
